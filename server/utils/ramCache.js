/**
 * Lightweight in-memory cache (L1) that sits in front of MongoDB (L2).
 *
 * Every entry has a TTL (default 10 minutes). Expired entries are lazily
 * evicted on access and periodically swept every 5 minutes to prevent
 * unbounded memory growth.
 *
 * Usage:
 *   const { cached, invalidate, flush } = require('../utils/ramCache');
 *
 *   // Wrap any async function — cache key + fetcher
 *   const data = await cached('movie-list-page1', () => Movie.find(...), 600_000);
 *
 *   // Bust a specific key after a write
 *   invalidate('movie-detail-12345');
 *
 *   // Nuke everything (e.g. after a bulk sync)
 *   flush();
 */

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
const SWEEP_INTERVAL = 5 * 60 * 1000; // sweep every 5 minutes

const store = new Map(); // key → { data, expiresAt }

/**
 * Return cached data if fresh, otherwise call `fetcher()`, cache the result,
 * and return it.
 *
 * @param {string}   key      Unique cache key
 * @param {Function} fetcher  Async function that produces the value on cache miss
 * @param {number}   [ttl]    Time-to-live in milliseconds (default 10 min)
 * @returns {Promise<*>}
 */
const cached = async (key, fetcher, ttl = DEFAULT_TTL) => {
  const entry = store.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }

  // Cache miss or expired — fetch fresh data
  const data = await fetcher();
  store.set(key, { data, expiresAt: Date.now() + ttl });
  return data;
};

/** Remove a single cache entry (e.g. after updating a movie). */
const invalidate = (key) => store.delete(key);

/** Remove all entries whose keys start with the given prefix. */
const invalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

/** Clear the entire cache (e.g. after a bulk sync). */
const flush = () => store.clear();

/** Current cache size (for health/debug endpoints). */
const size = () => store.size;

// Periodic sweep: remove expired entries so memory doesn't grow forever
const _sweep = () => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.expiresAt) store.delete(key);
  }
};
const _sweepTimer = setInterval(_sweep, SWEEP_INTERVAL);
_sweepTimer.unref(); // don't prevent Node from exiting

module.exports = { cached, invalidate, invalidatePrefix, flush, size };
