const crypto = require('crypto');
const Room   = require('../models/Room');
const Movie  = require('../models/Movie');
const ApiError      = require('../utils/ApiError');
const asyncHandler  = require('../utils/asyncHandler');
const { rankMovies } = require('../services/rankingEngine');
const { emitToRoom, sanitizeRoom, mysteryClues, withVoteView } = require('../services/socketService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TRANSITIONS = {
  lobby:       ['preferences', 'voting'],
  preferences: ['voting'],
  voting:      ['revealed'],
};

async function generateCode() {
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!(await Room.exists({ code }))) return code;
  }
  throw ApiError.badRequest('Could not generate unique room code');
}

function assertTransition(current, next) {
  if (!TRANSITIONS[current]?.includes(next))
    throw new ApiError(409, `Cannot transition from '${current}' to '${next}'`);
}

function getMember(room, userId) {
  const id = userId.toString();
  return room.members.find((m) => {
    const memberId = m.user?._id ? m.user._id.toString() : m.user.toString();
    return memberId === id;
  });
}

// Strip mystery fields from a populated shortlist item's movie
function applyMysteryFilter(room, userId) {
  const obj = withVoteView(room, userId);
  if (obj.mode !== 'mystery' || obj.status === 'revealed') return obj;
  obj.shortlist = obj.shortlist.map((item) => ({
    ...item,
    movie: item.movie ? mysteryClues(item.movie) : null,
  }));
  obj.result = null;
  return obj;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// POST /api/rooms
const createRoom = asyncHandler(async (req, res) => {
  const { mode = 'normal' } = req.body;
  const code = await generateCode();
  const room = await Room.create({
    code, host: req.user._id, mode,
    members: [{ user: req.user._id }],
  });
  res.status(201).json({ success: true, data: room });
});

// POST /api/rooms/join
const joinRoom = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw ApiError.badRequest('code is required');

  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) throw ApiError.notFound('Room not found');
  if (!['lobby', 'preferences'].includes(room.status))
    throw new ApiError(409, 'Room is no longer accepting members');

  if (!getMember(room, req.user._id)) {
    room.members.push({ user: req.user._id });
    await room.save();
    emitToRoom(room.code, 'member-joined', { user: { _id: req.user._id, name: req.user.name } });
  }
  res.json({ success: true, data: room });
});

// GET /api/rooms/:code
const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() })
    .populate('members.user', 'name')
    .populate('shortlist.movie')
    .populate('result');
  if (!room) throw ApiError.notFound('Room not found');
  if (!getMember(room, req.user._id)) throw ApiError.forbidden('Not a member of this room');

  res.json({ success: true, data: applyMysteryFilter(room, req.user._id) });
});

// PUT /api/rooms/:code/preferences
const submitPreferences = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) throw ApiError.notFound('Room not found');
  if (!['lobby', 'preferences'].includes(room.status))
    throw new ApiError(409, 'Preferences can only be submitted in lobby or preferences phase');

  const member = getMember(room, req.user._id);
  if (!member) throw ApiError.forbidden('Not a member of this room');

  const { genres, languages, maxRuntime, minRating, mood, platforms } = req.body;
  if (genres     !== undefined) member.preferences.genres     = genres;
  if (languages  !== undefined) member.preferences.languages  = languages;
  if (maxRuntime !== undefined) member.preferences.maxRuntime = maxRuntime;
  if (minRating  !== undefined) member.preferences.minRating  = minRating;
  if (mood       !== undefined) member.preferences.mood       = mood;
  if (platforms  !== undefined) member.preferences.platforms  = platforms;
  member.preferencesSubmitted = true;

  if (room.status === 'lobby') room.status = 'preferences';
  await room.save();

  emitToRoom(room.code, 'preferences-submitted', {
    userId: req.user._id,
    readyCount: room.members.filter((m) => m.preferencesSubmitted).length,
    totalCount: room.members.length,
  });

  res.json({ success: true, data: room });
});

// POST /api/rooms/:code/start-voting
const startVoting = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) throw ApiError.notFound('Room not found');
  if (room.host.toString() !== req.user._id.toString()) throw ApiError.forbidden('Host only');
  assertTransition(room.status, 'voting');

  // Only members who actually submitted preferences constrain the group;
  // an untouched default profile (no platforms, etc.) must not wipe out every movie.
  const submitted = room.members.filter((m) => m.preferencesSubmitted);
  const members = (submitted.length ? submitted : room.members).map((m) => ({ preferences: m.preferences }));

  // Genres and moods are soft-scored by the engine, and the hard constraints (with their
  // relaxation fallback) live in the engine too, so the DB pre-filter must stay loose:
  // take the most popular candidates and let the engine decide. Filtering by genre/language/
  // runtime here would make relaxation ineffective and could drop other members' mood genres.
  const candidates = await Movie.find({}).sort({ popularity: -1 }).limit(1000).lean();
  const region = req.user.profile?.region || 'IN';
  const { rankedMovies, relaxedConstraints } = rankMovies(members, candidates, { region });

  room.shortlist = rankedMovies.map((r) => ({
    movie: r.movie._id, score: r.score,
    matchedMembers: r.matchedMembers, explanation: r.explanation,
  }));
  room.relaxedConstraints = relaxedConstraints;
  room.status = 'voting';
  await room.save();
  await room.populate('shortlist.movie');

  // Same payload for everyone: counts only, no per-user votes (none exist yet anyway)
  emitToRoom(room.code, 'voting-started', applyMysteryFilter(room, null));

  res.json({ success: true, data: applyMysteryFilter(room, req.user._id) });
});

// POST /api/rooms/:code/vote
const castVote = asyncHandler(async (req, res) => {
  const { movieId } = req.body;
  if (!movieId) throw ApiError.badRequest('movieId is required');

  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) throw ApiError.notFound('Room not found');
  if (room.status !== 'voting') throw new ApiError(409, 'Room is not in voting phase');
  if (!getMember(room, req.user._id)) throw ApiError.forbidden('Not a member of this room');

  const onShortlist = room.shortlist.some((s) => s.movie.toString() === movieId);
  if (!onShortlist) throw ApiError.badRequest('Movie not on shortlist');

  // Atomic upsert: one vote per member. Using room.save() here caused VersionErrors
  // (HTTP 500) when several members voted at the same moment.
  const updated = await Room.findOneAndUpdate(
    { _id: room._id, status: 'voting', 'votes.user': req.user._id },
    { $set: { 'votes.$.movie': movieId } },
    { new: true }
  ) || await Room.findOneAndUpdate(
    { _id: room._id, status: 'voting', 'votes.user': { $ne: req.user._id } },
    { $push: { votes: { user: req.user._id, movie: movieId } } },
    { new: true }
  );
  if (!updated) throw new ApiError(409, 'Vote could not be recorded, please retry');
  room.votes = updated.votes;

  // Emit vote counts only (never who voted what in mystery mode)
  const voteCounts = buildVoteCounts(room);
  emitToRoom(room.code, 'vote-cast', { voteCounts });

  res.json({ success: true, data: { voteCounts } });
});

// POST /api/rooms/:code/reveal
const revealRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) throw ApiError.notFound('Room not found');
  if (room.host.toString() !== req.user._id.toString()) throw ApiError.forbidden('Host only');
  assertTransition(room.status, 'revealed');

  // Tally votes; tie-break by engine score (deterministic)
  const counts = buildVoteCounts(room);
  const shortlistById = Object.fromEntries(room.shortlist.map((s) => [s.movie.toString(), s]));

  let winner = null;
  let maxVotes = -1;
  for (const [movieId, count] of Object.entries(counts)) {
    const item = shortlistById[movieId];
    if (!item) continue;
    if (
      count > maxVotes ||
      (count === maxVotes && item.score > (shortlistById[winner]?.score ?? -1))
    ) {
      maxVotes = count;
      winner = movieId;
    }
  }

  // If nobody voted, fall back to top engine score
  if (!winner && room.shortlist.length > 0) {
    winner = room.shortlist.reduce((best, cur) =>
      cur.score > best.score ? cur : best
    ).movie.toString();
  }

  room.result = winner;
  room.status = 'revealed';
  await room.save();
  await room.populate(['shortlist.movie', 'result']);

  const full = withVoteView(room, null);
  emitToRoom(room.code, 'result-revealed', full);

  res.json({ success: true, data: full });
});

// GET /api/rooms/history
const getRoomHistory = asyncHandler(async (req, res) => {
  const rooms = await Room.find({
    'members.user': req.user._id,
    status: 'revealed',
  })
    .populate('result', 'title posterPath genres rating runtime')
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  res.json({ success: true, data: rooms });
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildVoteCounts(room) {
  const counts = {};
  for (const v of room.votes) {
    const id = v.movie.toString();
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

module.exports = {
  createRoom, joinRoom, getRoom, submitPreferences,
  startVoting, castVote, revealRoom, getRoomHistory,
};
