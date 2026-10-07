const mongoose = require('mongoose');
const Watchlist = require('../models/Watchlist');
const Movie = require('../models/Movie');
const ApiError = require('../utils/ApiError');
const { platformKey } = require('../utils/platforms');

const addMovie = async (userId, movieId) => {
  if (!mongoose.isValidObjectId(movieId)) throw ApiError.notFound('Movie not found');
  const movie = await Movie.findById(movieId, { _id: 1 }).lean();
  if (!movie) throw ApiError.notFound('Movie not found');

  // Check for duplicate before mutating
  const existing = await Watchlist.findOne({ user: userId, 'movies.movie': movieId });
  if (existing) throw ApiError.badRequest('Movie already in watchlist');

  // Upsert the watchlist document and push the new entry
  const watchlist = await Watchlist.findOneAndUpdate(
    { user: userId },
    { $push: { movies: { movie: movieId, addedAt: new Date() } } },
    { upsert: true, new: true }
  );
  return watchlist;
};

const removeMovie = async (userId, movieId) => {
  if (!mongoose.isValidObjectId(movieId)) throw ApiError.notFound('Movie not found');
  const result = await Watchlist.findOneAndUpdate(
    { user: userId },
    { $pull: { movies: { movie: movieId } } },
    { new: true }
  );
  if (!result) throw ApiError.notFound('Watchlist not found');
  return result;
};

const getWatchlist = async (userId, rawQuery = {}) => {
  const { platform, sortBy = 'addedAt', order = 'desc' } = rawQuery;

  const region = /^[A-Za-z]{2}$/.test(rawQuery.region ?? '') ? rawQuery.region.toUpperCase() : 'IN';

  const doc = await Watchlist.findOne({ user: userId })
    .populate({
      path: 'movies.movie',
      select: `tmdbId title posterPath backdropPath genres language rating releaseYear runtime overview providers.${region}`,
    })
    .lean();

  if (!doc) return { movies: [], savedIds: [] };

  let movies = doc.movies
    .filter((e) => e.movie != null) // guard against orphaned refs
    .map((e) => ({ ...e.movie, addedAt: e.addedAt }));

  // Platform filter
  if (platform) {
    const wanted = platform.split(',').map((p) => platformKey(p.trim())).filter(Boolean);
    movies = movies.filter((m) => {
      const provs = m.providers?.[region] ?? [];
      return provs.some((p) => wanted.includes(platformKey(p.name)));
    });
  }

  // Sort
  const dir = order === 'asc' ? 1 : -1;
  const key = sortBy === 'rating' ? 'rating'
    : sortBy === 'year' ? 'releaseYear'
    : sortBy === 'title' ? 'title'
    : 'addedAt';

  movies.sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return 0;
  });

  const savedIds = doc.movies.map((e) => e.movie?._id?.toString()).filter(Boolean);
  return { movies, savedIds };
};

// Lightweight: just return the set of saved movie IDs for the current user
const getSavedIds = async (userId) => {
  const doc = await Watchlist.findOne({ user: userId }, { 'movies.movie': 1 }).lean();
  return (doc?.movies ?? []).map((e) => e.movie?.toString()).filter(Boolean);
};

module.exports = { addMovie, removeMovie, getWatchlist, getSavedIds };
