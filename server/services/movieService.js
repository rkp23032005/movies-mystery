const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const ApiError = require('../utils/ApiError');
const { expandPlatformNames } = require('../utils/platforms');
const { cached } = require('../utils/ramCache');
const tmdb = require('./tmdbClient');
const { mapDetailedMovie, fetchDetail } = require('./syncService');

const SORT_FIELDS = { rating: 'rating', popularity: 'popularity', year: 'releaseYear', runtime: 'runtime' };
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Cache TTLs
const LIST_CACHE_TTL    = 2 * 60 * 1000;   // 2 minutes for list/search results
const DETAIL_CACHE_TTL  = 10 * 60 * 1000;  // 10 minutes for single movie detail
const FILTER_META_TTL   = 60 * 60 * 1000;  // 1 hour for filter metadata

/** Build a deterministic cache key from query params. */
const listCacheKey = (raw) => {
  const parts = Object.keys(raw)
    .sort()
    .map((k) => `${k}=${raw[k]}`)
    .join('&');
  return `movies-list:${parts}`;
};

/**
 * Build and execute the aggregation pipeline for GET /api/movies.
 *
 * Pipeline stages (in order):
 *
 * 1. $match  — applies all filters as early as possible so later stages work
 *              on the smallest possible set. Uses the text index when `q` is
 *              present, otherwise falls back to a regex on title only.
 *
 * 2. $addFields (textScore) — when a text query is present, expose the
 *              computed text-relevance score so we can sort by it.
 *
 * 3. $match (provider) — provider filtering is a second $match because it
 *              requires inspecting the nested Map structure; keeping it
 *              separate makes the intent clear and lets the first $match
 *              shrink the set first.
 *
 * 4. $sort   — applied before $facet so both the data slice and the count
 *              see the same ordering (count doesn't care, but it's cleaner).
 *
 * 5. $facet  — runs two sub-pipelines in parallel on the same input:
 *              • "data": $skip → $limit → $project (only fields the UI needs)
 *              • "count": $count (single document with total)
 *              This avoids two separate DB round-trips.
 *
 * 6. $project (root) — reshape the facet output into { data, total }.
 */
const queryMovies = async (rawQuery) => {
  const cacheKey = listCacheKey(rawQuery);
  return cached(cacheKey, () => _queryMoviesFromDB(rawQuery), LIST_CACHE_TTL);
};

/** The actual aggregation (called on cache miss). */
const _queryMoviesFromDB = async (rawQuery) => {
  const {
    q: rawQ, genre: rawGenre, language: rawLanguage, minRating, maxRuntime,
    yearFrom, yearTo, platform: rawPlatform, region: rawRegion,
    sortBy = 'popularity', order = 'desc',
    page = 1, limit = DEFAULT_LIMIT,
  } = rawQuery;

  // Query-string values can be arrays (?q=a&q=b); coerce to strings so .trim()/.split() never throw
  const str = (v) => (Array.isArray(v) ? v[0] : v)?.toString();
  const q = str(rawQ), genre = str(rawGenre), language = str(rawLanguage), platform = str(rawPlatform);
  const region = /^[A-Za-z]{2}$/.test(str(rawRegion) ?? '') ? str(rawRegion).toUpperCase() : 'IN';

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  const skip     = (pageNum - 1) * limitNum;
  const sortDir  = order === 'asc' ? 1 : -1;
  const sortKey  = SORT_FIELDS[sortBy] ?? 'popularity';

  // ── Real-Time TMDB Search ──────────────────────────────────────────────────
  // If the user searches by query, call TMDB live to give access to all TMDB movies!
  if (q && q.trim()) {
    try {
      const tmdbRes = await tmdb.get('/search/movie', {
        query: q.trim(),
        page: pageNum,
        include_adult: false,
      });
      const results = tmdbRes.results || [];
      if (results.length > 0) {
        // Upsert all found movies so they exist in MongoDB and have valid _ids
        const ops = results.map((m) => ({
          updateOne: {
            filter: { tmdbId: m.id },
            update: {
              $setOnInsert: {
                tmdbId:       m.id,
                title:        m.title ?? m.original_title ?? '',
                overview:     m.overview ?? '',
                language:     m.original_language ?? 'en',
                releaseYear:  m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null,
                rating:       m.vote_average ?? 0,
                popularity:   m.popularity ?? 0,
                posterPath:   m.poster_path ?? '',
                backdropPath: m.backdrop_path ?? '',
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));
        await Movie.bulkWrite(ops, { ordered: false });

        // Retrieve from MongoDB with _id and streaming providers
        const docs = await Movie.find(
          { tmdbId: { $in: results.map((r) => r.id) } },
          {
            tmdbId: 1, title: 1, posterPath: 1, backdropPath: 1,
            genres: 1, language: 1, rating: 1, popularity: 1,
            releaseYear: 1, runtime: 1, overview: 1,
            [`providers.${region}`]: 1,
          }
        ).lean();

        const docMap = new Map(docs.map((d) => [d.tmdbId, d]));
        const ordered = results.map((r) => docMap.get(r.id)).filter(Boolean);

        return {
          data: ordered,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: tmdbRes.total_results,
            totalPages: Math.min(tmdbRes.total_pages, 500),
          },
        };
      }
    } catch (err) {
      console.warn('[searchLiveTmdb] falling back to database search:', err.message);
    }
  }

  // ── Stage 1: primary $match ───────────────────────────────────────────────
  const match = {};

  if (q && q.trim()) {
    // Use the text index for relevance-ranked search
    match.$text = { $search: q.trim() };
  }

  if (genre) {
    const genres = genre.split(',').map((g) => g.trim()).filter(Boolean);
    if (genres.length) match.genres = { $in: genres };
  }

  if (language) match.language = language.trim();

  if (minRating) {
    const r = parseFloat(minRating);
    if (!isNaN(r)) match.rating = { $gte: r };
  }

  if (maxRuntime) {
    const rt = parseInt(maxRuntime, 10);
    if (!isNaN(rt)) match.runtime = { ...(match.runtime ?? {}), $lte: rt };
  }

  if (yearFrom || yearTo) {
    const yf = parseInt(yearFrom, 10), yt = parseInt(yearTo, 10);
    if (!isNaN(yf) || !isNaN(yt)) {
      match.releaseYear = {};
      if (!isNaN(yf)) match.releaseYear.$gte = yf;
      if (!isNaN(yt)) match.releaseYear.$lte = yt;
    }
  }

  // ── Stage 2: text score field ─────────────────────────────────────────────
  const addFieldsStage = q?.trim()
    ? [{ $addFields: { _score: { $meta: 'textScore' } } }]
    : [];

  // ── Stage 3: provider $match ──────────────────────────────────────────────
  const providerStages = [];
  if (platform) {
    const platforms = platform.split(',').map((p) => p.trim()).filter(Boolean);
    if (platforms.length) {
      // providers is a Map stored as an object; the region key holds an array
      // of provider objects. We use $elemMatch on the region's array.
      providerStages.push({
        $match: {
          [`providers.${region}`]: {
            $elemMatch: { name: { $in: expandPlatformNames(platforms) } },
          },
        },
      });
    }
  }

  // ── Stage 4: $sort ────────────────────────────────────────────────────────
  const sortStage = q?.trim()
    ? { $sort: { _score: -1, [sortKey]: sortDir } }   // text queries: relevance first
    : { $sort: { [sortKey]: sortDir } };

  // ── Stage 5 & 6: $facet + reshape ────────────────────────────────────────
  const pipeline = [
    { $match: match },
    ...addFieldsStage,
    ...providerStages,
    sortStage,
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              tmdbId: 1, title: 1, posterPath: 1, backdropPath: 1,
              genres: 1, language: 1, rating: 1, popularity: 1,
              releaseYear: 1, runtime: 1, overview: 1,
              [`providers.${region}`]: 1,
              ...(q?.trim() ? { _score: 1 } : {}),
            },
          },
        ],
        count: [{ $count: 'total' }],
      },
    },
    {
      $project: {
        data:  1,
        total: { $ifNull: [{ $arrayElemAt: ['$count.total', 0] }, 0] },
      },
    },
  ];

  const [result] = await Movie.aggregate(pipeline);
  const total = result?.total ?? 0;

  return {
    data: result?.data ?? [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const getMovieById = async (id) => {
  const isMongoId = mongoose.isValidObjectId(id);
  const isNumeric = /^\d+$/.test(id);
  if (!isMongoId && !isNumeric) throw ApiError.notFound('Movie not found');

  const cacheKey = `movie-detail:${id}`;
  return cached(cacheKey, async () => {
    let movie = isMongoId
      ? await Movie.findById(id).lean()
      : await Movie.findOne({ tmdbId: Number(id) }).lean();

    // If not found in DB yet and is numeric or TMDB key exists, fetch live from TMDB!
    if (!movie && isNumeric) {
      try {
        const detail = await fetchDetail(Number(id));
        const doc = mapDetailedMovie(detail);
        movie = await Movie.findOneAndUpdate(
          { tmdbId: Number(id) },
          { $set: doc },
          { upsert: true, new: true }
        ).lean();
      } catch (err) {
        console.warn(`[getMovieById] live TMDB fetch failed for ${id}:`, err.message);
      }
    }

    if (!movie) throw ApiError.notFound('Movie not found');

    // Similar movies: share at least one genre, exclude self, top 6 by popularity
    const similar = await Movie.find(
      { genres: { $in: movie.genres }, _id: { $ne: movie._id } },
      { tmdbId: 1, title: 1, posterPath: 1, rating: 1, releaseYear: 1, genres: 1 }
    )
      .sort({ popularity: -1 })
      .limit(6)
      .lean();

    return { movie, similar };
  }, DETAIL_CACHE_TTL);
};

const getFilterMeta = async () => {
  return cached('filter-meta', async () => {
    const [genres, languages, providerAgg] = await Promise.all([
      Movie.distinct('genres'),
      Movie.distinct('language'),
      // Collect all provider names across all regions from the providers Map
      Movie.aggregate([
        { $project: { providerValues: { $objectToArray: '$providers' } } },
        { $unwind: '$providerValues' },
        { $unwind: '$providerValues.v' },
        { $group: { _id: '$providerValues.v.name' } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      genres:    genres.filter(Boolean).sort(),
      languages: languages.filter(Boolean).sort(),
      platforms: providerAgg.map((p) => p._id).filter(Boolean),
    };
  }, FILTER_META_TTL);
};

module.exports = { queryMovies, getMovieById, getFilterMeta };
