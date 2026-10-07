const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, minlength: 6, maxlength: 6 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        preferences: {
          genres:     { type: [String], default: [] },
          languages:  { type: [String], default: [] },
          platforms:  { type: [String], default: [] },
          minRating:  { type: Number, default: 0 },
          maxRuntime: { type: Number, default: null },
          mood:       { type: String, default: null },
        },
        preferencesSubmitted: { type: Boolean, default: false },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['lobby', 'preferences', 'voting', 'revealed'],
      default: 'lobby',
    },
    shortlist: [
      {
        movie:          { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
        score:          Number,
        matchedMembers: Number,
        explanation:    String,
      },
    ],
    relaxedConstraints: { type: [String], default: [] },
    votes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
        value: { type: Number, default: 1 },
      },
    ],
    result: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', default: null },
    mode: { type: String, enum: ['normal', 'mystery'], default: 'normal' },
  },
  { timestamps: true }
);

// Covers GET /rooms/history: filter by member + status, sort by updatedAt
roomSchema.index({ 'members.user': 1, status: 1, updatedAt: -1 }, { name: 'member_status_updated' });

module.exports = mongoose.model('Room', roomSchema);
