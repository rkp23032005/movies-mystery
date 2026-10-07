const tmdb = require('./tmdbClient');
const Movie = require('../models/Movie');

// ── config ───────────────────────────────────────────────────────────────────

// Streaming data is only stored for these regions (keeps documents small; the client's
// region picker offers exactly these).
const DEFAULT_REGIONS = ['IN', 'US', 'GB', 'AU', 'CA'];

// TMDB allows ~40-50 req/s. 8 parallel calls + a 250 ms pause ≈ 30 req/s.
const CONCURRENCY = 40;
const PAUSE_MS = 100;
// TMDB never returns more than 500 pages (10,000 results) for one query.
const TMDB_MAX_PAGES = 500;

// ── helpers ──────────────────────────────────────────────────────────────────

let genreMap = {}; // { 28: 'Action', ... }

const loadGenreMap = async () => {
  const data = await tmdb.get('/genre/movie/list');
  genreMap = Object.fromEntries((data.genres ?? []).map((g) => [g.id, g.name]));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const flattenProviders = (rawProviders = {}, regions = DEFAULT_REGIONS) => {
  const providers = {};
  for (const reg of regions) {
    const info = rawProviders[reg];
    if (!info) continue;
    const flat = [
      ...(info.flatrate ?? []).map((p) => ({ name: p.provider_name, type: 'flatrate' })),
      ...(info.rent    ?? []).map((p) => ({ name: p.provider_name, type: 'rent' })),
      ...(info.buy     ?? []).map((p) => ({ name: p.provider_name, type: 'buy' })),
    ];
    if (flat.length) providers[reg] = flat;
  }
  return providers;
};

/**
 * Map a full /movie/{id}?append_to_response=credits,videos,watch/providers payload
 * to our schema. One request gives runtime, genres, cast, trailer and providers
 * (list/discover endpoints return NO runtime and only genre ids).
 */
const mapDetailedMovie = (d, regions = DEFAULT_REGIONS) => {
  const trailer = (d.videos?.results ?? []).find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const doc = {
    tmdbId:       d.id,
    title:        d.title ?? d.original_title ?? '',
    overview:     d.overview ?? '',
    genres:       (d.genres ?? []).map((g) => g.name),
    language:     d.original_language ?? 'en',
    runtime:      d.runtime ?? 0,
    releaseYear:  d.release_date ? parseInt(d.release_date.slice(0, 4), 10) : null,
    rating:       d.vote_average ?? 0,
    popularity:   d.popularity ?? 0,
    posterPath:   d.poster_path ?? '',
    backdropPath: d.backdrop_path ?? '',
    cast:         (d.credits?.cast ?? []).slice(0, 8).map((c) => c.name),
    trailerKey:   trailer?.key ?? '',
    providers:    flattenProviders(d['watch/providers']?.results, regions),
    lastSyncedAt: new Date(),
  };
  if (!doc.releaseYear) delete doc.releaseYear; // NaN / null would fail schema casting
  return doc;
};

// Map a bare list/discover row (no runtime, cast, trailer or providers).
const mapListMovie = (m) => ({
  tmdbId:       m.id,
  title:        m.title ?? m.original_title ?? '',
  overview:     m.overview ?? '',
  genres:       (m.genre_ids ?? []).map((id) => genreMap[id]).filter(Boolean),
  language:     m.original_language ?? 'en',
  ...(m.release_date ? { releaseYear: parseInt(m.release_date.slice(0, 4), 10) } : {}),
  rating:       m.vote_average ?? 0,
  popularity:   m.popularity ?? 0,
  posterPath:   m.poster_path ?? '',
  backdropPath: m.backdrop_path ?? '',
  lastSyncedAt: new Date(),
});

const fetchDetail = (tmdbId) =>
  tmdb.get(`/movie/${tmdbId}`, { append_to_response: 'credits,videos,watch/providers' });

const upsertMovies = async (movies) => {
  const ops = movies.map((m) => ({
    updateOne: { filter: { tmdbId: m.tmdbId }, update: { $set: m }, upsert: true },
  }));
  if (ops.length) await Movie.bulkWrite(ops, { ordered: false });
  return ops.length;
};

// Run `fn` over items with limited parallelism and a pause between batches.
const inBatches = async (items, fn) => {
  const out = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const settled = await Promise.allSettled(items.slice(i, i + CONCURRENCY).map(fn));
    out.push(...settled);
    await sleep(PAUSE_MS);
  }
  return out;
};

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Pull a large, quality-filtered catalogue using /discover/movie sliced by release year.
 * Each year is its own query, so the 10,000-result-per-query TMDB cap never applies
 * (with a vote filter, a year holds a few hundred to a few thousand movies).
 *
 * Resumable: a movie that is already stored with details (cast present) and is fresher
 * than STALE_DAYS is skipped, so an interrupted run can simply be started again.
 *
 * @param {object}  opts
 * @param {number}  opts.targetCount  stop after this many movies were stored/refreshed (default 30000)
 * @param {number}  opts.minVotes     vote_count.gte filter — drops obscure titles (default 100)
 * @param {number}  opts.yearFrom     oldest release year (default 1960)
 * @param {number}  opts.yearTo       newest release year (default: current year)
 * @param {boolean} opts.withDetails  fetch runtime/cast/trailer/providers (default true)
 * @param {string[]} opts.regions     provider regions to keep (default IN, US, GB, AU, CA)
 */
const syncDiscover = async ({
  targetCount = 30000,
  minVotes = 100,
  yearFrom = 1960,
  yearTo = new Date().getFullYear(),
  withDetails = true,
  regions = DEFAULT_REGIONS,
} = {}) => {
  await loadGenreMap();
  const staleMs = parseInt(process.env.STALE_DAYS ?? '7', 10) * 86400 * 1000;
  let stored = 0;
  let skipped = 0;
  let failed = 0;

  // Newest years first: they matter most for streaming availability.
  for (let year = yearTo; year >= yearFrom && stored < targetCount; year--) {
    let page = 1;
    let totalPages = 1;
    let yearCount = 0;

    while (page <= Math.min(totalPages, TMDB_MAX_PAGES) && stored < targetCount) {
      let data;
      try {
        data = await tmdb.get('/discover/movie', {
          primary_release_year: year,
          'vote_count.gte': minVotes,
          sort_by: 'popularity.desc',
          include_adult: false,
          page,
        });
      } catch (err) {
        console.warn(`  ⚠ ${year} page ${page} failed (${err.message}) — skipping page`);
        page++;
        continue;
      }
      totalPages = data.total_pages ?? 1;
      const rows = (data.results ?? []).filter((m) => m.id && m.title).slice(0, targetCount - stored);

      // Resume: figure out which of these are already complete and fresh
      const existing = await Movie.find(
        { tmdbId: { $in: rows.map((m) => m.id) } },
        { tmdbId: 1, lastSyncedAt: 1, 'cast': { $slice: 1 } }
      ).lean();
      const fresh = new Set(
        existing
          .filter((e) => e.lastSyncedAt && Date.now() - e.lastSyncedAt.getTime() < staleMs && (!withDetails || e.cast?.length))
          .map((e) => e.tmdbId)
      );
      const todo = rows.filter((m) => !fresh.has(m.id));
      skipped += rows.length - todo.length;

      let docs;
      if (withDetails) {
        const results = await inBatches(todo, (m) => fetchDetail(m.id));
        docs = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') docs.push(mapDetailedMovie(r.value, regions));
          else { failed++; console.warn(`  ⚠ detail ${todo[i].id} failed (${r.reason?.message})`); }
        });
      } else {
        docs = todo.map(mapListMovie);
        await sleep(PAUSE_MS);
      }

      stored += await upsertMovies(docs);
      yearCount += docs.length;
      page++;
    }
    console.log(`  ${year}: +${yearCount}  (total ${stored}, skipped ${skipped}, failed ${failed})`);
  }

  console.log(`Discover sync complete — ${stored} stored, ${skipped} already fresh, ${failed} failed`);
  return { stored, skipped, failed };
};

/**
 * Re-sync a single movie if its lastSyncedAt is older than STALE_DAYS.
 * Called lazily from the movie detail endpoint.
 */
const syncOneIfStale = async (tmdbId) => {
  const staleDays = parseInt(process.env.STALE_DAYS ?? '7', 10);
  const movie = await Movie.findOne({ tmdbId });
  if (movie && movie.lastSyncedAt) {
    const ageMs = Date.now() - movie.lastSyncedAt.getTime();
    if (ageMs < staleDays * 86400 * 1000) return; // fresh enough
  }
  const detail = await fetchDetail(tmdbId);
  await Movie.findOneAndUpdate({ tmdbId }, { $set: mapDetailedMovie(detail) }, { upsert: true });
};

// Kept for backwards compatibility with `npm run sync` / older callers:
// refresh the popular / top-rated lists (no year slicing).
const sync = async ({ pagesPerList = 5, withDetails = true } = {}) => {
  await loadGenreMap();
  let total = 0;
  for (const endpoint of ['/movie/popular', '/movie/top_rated', '/movie/now_playing']) {
    const rows = [];
    for (let p = 1; p <= pagesPerList; p++) {
      try {
        const data = await tmdb.get(endpoint, { page: p });
        rows.push(...(data.results ?? []));
        if (p >= (data.total_pages ?? 1)) break;
      } catch (err) { console.warn(`  ⚠ ${endpoint} page ${p} failed (${err.message})`); }
      await sleep(PAUSE_MS);
    }
    const valid = rows.filter((m) => m.id && m.title);
    let docs;
    if (withDetails) {
      const res = await inBatches(valid, (m) => fetchDetail(m.id));
      docs = res.filter((r) => r.status === 'fulfilled').map((r) => mapDetailedMovie(r.value));
    } else {
      docs = valid.map(mapListMovie);
    }
    total += await upsertMovies(docs);
    console.log(`  synced ${docs.length} from ${endpoint}`);
  }
  console.log(`Sync complete — ${total} operations`);
  return total;
};

module.exports = { sync, syncDiscover, syncOneIfStale, mapDetailedMovie, mapListMovie, flattenProviders };
