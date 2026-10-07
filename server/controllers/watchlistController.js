const watchlistService = require('../services/watchlistService');
const asyncHandler = require('../utils/asyncHandler');

const add = asyncHandler(async (req, res) => {
  await watchlistService.addMovie(req.user._id, req.params.movieId);
  res.status(201).json({ success: true, message: 'Added to watchlist' });
});

const remove = asyncHandler(async (req, res) => {
  await watchlistService.removeMovie(req.user._id, req.params.movieId);
  res.json({ success: true, message: 'Removed from watchlist' });
});

const list = asyncHandler(async (req, res) => {
  const result = await watchlistService.getWatchlist(req.user._id, req.query);
  res.json({ success: true, ...result });
});

module.exports = { add, remove, list };
