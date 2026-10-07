const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Room = require('../models/Room');

// Shared io instance — set once from server.js
let io;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Same rules as app.js: comma-separated list, trailing slashes ignored
      origin: (process.env.CLIENT_ORIGIN || '')
        .split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean),
      credentials: true,
    },
  });

  // ── JWT auth middleware ──────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).lean();
      if (!user) return next(new Error('Unauthorized'));
      socket.user = { _id: user._id.toString(), name: user.name };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // ── join-room: subscribe to a room channel ─────────────────────────────
    socket.on('join-room', async (rawCode) => {
     try {
      if (!rawCode || typeof rawCode !== 'string') return;
      const code = rawCode.toUpperCase(); // emitToRoom uses the stored (uppercase) code
      const room = await Room.findOne({ code: code.toUpperCase() })
        .populate('members.user', 'name')
        .populate('shortlist.movie')
        .populate('result')
        .lean();
      if (!room) return socket.emit('error', 'Room not found');

      const isMember = room.members.some((m) => m.user._id.toString() === socket.user._id);
      if (!isMember) return socket.emit('error', 'Not a member');

      socket.join(code);
      socket.roomCode = code;

      // Send full state snapshot so reconnecting clients resync
      socket.emit('state-snapshot', sanitizeRoom(room, socket.user._id));

      socket.to(code).emit('member-joined', { user: socket.user });
     } catch (err) {
      console.error('join-room failed:', err.message);
      socket.emit('error', 'Could not join room');
     }
    });

    socket.on('disconnecting', () => {
      if (socket.roomCode) {
        socket.to(socket.roomCode).emit('member-left', { user: socket.user });
      }
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
}

// ── Emit helpers (called from controllers) ──────────────────────────────────

function emitToRoom(code, event, data) {
  if (!io) return; // no-op in test environment
  io.to(code).emit(event, data);
}

// Strip mystery fields from shortlist items before reveal
function sanitizeRoom(room, requestingUserId) {
  room = withVoteView(room, requestingUserId);
  if (room.status !== 'revealed' && room.mode === 'mystery') {
    room = {
      ...room,
      shortlist: (room.shortlist || []).map((item) => ({
        ...item,
        movie: item.movie ? mysteryClues(item.movie) : null,
      })),
      result: null,
    };
  }
  return room;
}

// Replace the raw votes array with aggregate counts + the requester's own vote,
// so members never see who voted for what while voting is open.
function withVoteView(room, requestingUserId) {
  // flattenMaps: a Mongoose Map (movie.providers) would otherwise JSON-serialise to {}
  const plain = room.toObject ? room.toObject({ flattenMaps: true }) : { ...room };
  const voteCounts = {};
  let myVote = null;
  for (const v of plain.votes || []) {
    const mid = (v.movie?._id ?? v.movie).toString();
    voteCounts[mid] = (voteCounts[mid] || 0) + 1;
    if (requestingUserId && (v.user?._id ?? v.user).toString() === requestingUserId.toString()) myVote = mid;
  }
  if (plain.status === 'revealed') return { ...plain, voteCounts, myVote };
  const { votes, ...rest } = plain; // eslint-disable-line no-unused-vars
  return { ...rest, voteCounts, myVote };
}

function mysteryClues(movie) {
  return {
    _id:         movie._id,
    genres:      movie.genres,
    runtime:     movie.runtime,
    decade:      movie.releaseYear ? Math.floor(movie.releaseYear / 10) * 10 + 's' : null,
    ratingBand:  ratingBand(movie.rating),
    providers:   movie.providers,
    // deliberately omit: title, posterPath, backdropPath, overview, cast
  };
}

function ratingBand(r) {
  if (r >= 8) return 'Excellent (8+)';
  if (r >= 7) return 'Good (7–8)';
  if (r >= 6) return 'Decent (6–7)';
  return 'Mixed (<6)';
}

module.exports = { init, getIo, emitToRoom, sanitizeRoom, mysteryClues, withVoteView };
