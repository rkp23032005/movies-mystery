const movieService = require('../services/movieService');
const { syncOneIfStale } = require('../services/syncService');
const asyncHandler = require('../utils/asyncHandler');

const listMovies = asyncHandler(async (req, res) => {
  const result = await movieService.queryMovies(req.query);
  res.json({ success: true, ...result });
});

const getMovie = asyncHandler(async (req, res) => {
  const result = await movieService.getMovieById(req.params.id);
  // Lazily re-sync if stale (non-blocking — we still return current data).
  // Only when a TMDB key exists; the route param is the Mongo _id, so use the movie's tmdbId.
  if (process.env.TMDB_API_KEY && result.movie.tmdbId) {
    syncOneIfStale(result.movie.tmdbId).catch(() => {});
  }
  res.json({ success: true, ...result });
});

const getFilterMeta = asyncHandler(async (req, res) => {
  const meta = await movieService.getFilterMeta();
  res.json({ success: true, ...meta });
});

module.exports = { listMovies, getMovie, getFilterMeta };
