/**
 * LOCAL  (full catalogue):
 *   npm run sync
 *   → 500,000 movies, minVotes=10, from 1900
 *
 * PRODUCTION (Atlas free tier ≤ 512 MB):
 *   npm run sync:prod
 *   → 50,000 movies, minVotes=500, from 1970  (well-known movies only)
 *
 * CUSTOM:
 *   npm run sync -- [--target=30000] [--min-votes=100] [--from=1960] [--to=2026] [--no-details]
 *
 * Safe to stop and re-run: movies already fresh (< STALE_DAYS) are skipped.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { syncDiscover } = require('../services/syncService');
const connectDB = require('../config/db');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const num = (v, d) => (v === undefined || isNaN(parseInt(v, 10)) ? d : parseInt(v, 10));

(async () => {
  if (!process.env.TMDB_API_KEY) throw new Error('TMDB_API_KEY is not set in server/.env');
  await connectDB();
  console.log('Discover sync started…');
  await syncDiscover({
    targetCount: num(args.target, 500000),
    minVotes:    num(args['min-votes'], 10),
    yearFrom:    num(args.from, 1900),
    yearTo:      num(args.to, new Date().getFullYear()),
    withDetails: !args['no-details'],
  });
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
