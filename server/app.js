require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const swaggerUi   = require('swagger-ui-express');
const swaggerSpec  = require('./docs/swagger');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes   = require('./routes/authRoutes');
const userRoutes   = require('./routes/userRoutes');
const movieRoutes     = require('./routes/movieRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const roomRoutes      = require('./routes/roomRoutes');

const app = express();

// Render/Vercel sit behind a reverse proxy; without this every client shares one IP
// for rate limiting and express-rate-limit raises X-Forwarded-For validation errors.
app.set('trust proxy', 1);

// Security
app.use(helmet());
// CLIENT_ORIGIN may hold several comma-separated origins; trailing slashes are ignored
// (browsers send Origin without one, so "https://x.vercel.app/" would never match).
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header = same-origin / curl / health checks
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Stricter limit on credential endpoints only (skip in test).
// GET /auth/me runs on every page load, so it must NOT share this budget.
const authLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// Body
app.use(express.json({ limit: '10kb' }));

// Must run AFTER the body parser, otherwise req.body is never sanitised
app.use(mongoSanitize());

// Logger (skip in test)
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// API Docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/health',    healthRoutes);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/movies',    movieRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/rooms',     roomRoutes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use(errorHandler);

module.exports = app;
