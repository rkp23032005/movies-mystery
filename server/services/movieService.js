const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const ApiError = require('../utils/ApiError');
const { expandPlatformNames } = require('../utils/platforms');

const SORT_FIELDS = { rating: 'rating', popularity: 'popularity', year: 'releaseYear', runtime: 'runtime' };
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Movie not found');
  const movie = await Movie.findById(id).lean();
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
};

const getFilterMeta = async () => {
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
};

module.exports = { queryMovies, getMovieById, getFilterMeta };
