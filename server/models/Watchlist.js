const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movies: [
      {
        movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// unique: true here — one watchlist document per user
watchlistSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
