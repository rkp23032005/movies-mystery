/**
 * npm run seed
 *
 * Strategy:
 *   1. If TMDB_API_KEY is set and valid → pull ~300 movies from TMDB and enrich
 *      them with credits, trailers, and streaming providers (the full pipeline).
 *   2. If TMDB_API_KEY is missing OR the first TMDB call fails (e.g. 401) →
 *      fall back to the static `movies.json` bundle (30 curated movies) so the
 *      project works for reviewers who don't have a TMDB key yet.
 *
 * The static bundle is always upserted first so the DB is never empty even if
 * the TMDB phase is skipped.
 */
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Movie = require('../models/Movie');

// ── helpers ─────────────────────────────────────────────────────────────────

const upsertMovies = async (movies) => {
  if (!movies.length) return 0;
  const ops = movies.map((m) => ({
    updateOne: {
      filter: { tmdbId: m.tmdbId },
      update: { $set: { ...m, lastSyncedAt: new Date() } },
      upsert: true,
    },
  }));
  const result = await Movie.bulkWrite(ops, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
};

// ── Phase A: static JSON fallback ────────────────────────────────────────────

const seedFromJson = async () => {
  const movies = require('./movies.json');
  const count = await upsertMovies(movies);
  console.log(`  ✔  Seeded ${count} movies from static bundle (movies.json)`);
  return count;
};

// ── Phase B: TMDB live sync ──────────────────────────────────────────────────

const seedFromTmdb = async () => {
  const { syncDiscover } = require('../services/syncService');
  const target = parseInt(process.env.SEED_TARGET ?? '5000', 10);
  console.log(`Seeding from TMDB discover (target ${target} movies, newest years first)…`);
  console.log('For a bigger catalogue run: npm run sync -- --target=30000');
  await syncDiscover({ targetCount: target, minVotes: 200 });
};

// ── Entry point ──────────────────────────────────────────────────────────────

(async () => {
  await connectDB();

  // Always seed the static bundle first — ensures DB is never empty
  console.log('\n── Step 1: Seeding static movie bundle (no API key needed)…');
  await seedFromJson();

  // Attempt live TMDB sync only if a key is configured
  if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
    console.log('\n── Step 2: TMDB_API_KEY not set — skipping live sync.');
    console.log('   To get richer data, add your key to server/.env and re-run npm run seed\n');
  } else {
    console.log('\n── Step 2: TMDB_API_KEY found — running live sync…');
    try {
      await seedFromTmdb();
      console.log('  ✔  Live TMDB sync complete');
    } catch (err) {
      console.warn(`  ⚠  TMDB sync failed (${err.message}) — static bundle is still loaded`);
    }
  }

  const total = await Movie.countDocuments();
  console.log(`\n✅ Done — ${total} movies in DB\n`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
