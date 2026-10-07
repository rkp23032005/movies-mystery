/**
 * Ranking Engine — pure module, no DB or Express imports.
 *
 * rankMovies(members, candidates) → { rankedMovies, relaxedConstraints }
 *
 * members:    Array<{ preferences: { genres, languages, platforms, minRating, maxRuntime, mood } }>
 * candidates: Array<Movie plain objects (from .lean())>
 */

const { platformKey } = require('../utils/platforms');

// ─── Config ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  genreOverlap:  0.40,
  rating:        0.25,
  popularity:    0.20,
  fairness:      0.15,
};

const MOOD_GENRE_MAP = {
  light:      ['Comedy', 'Family', 'Animation'],
  dark:       ['Thriller', 'Crime', 'Horror'],
  romantic:   ['Romance', 'Drama'],
  adventurous:['Adventure', 'Action', 'Science Fiction'],
  thoughtful: ['Drama', 'Documentary', 'History'],
  scary:      ['Horror', 'Mystery', 'Thriller'],
};

// Majority threshold: fraction of members that must have a platform (0 = all, 0.5 = half+)
const PLATFORM_MAJORITY = 0;   // default: all members must share at least one platform

const TOP_N = 10;

// Relaxation order (applied one at a time until ≥ TOP_N results)
const RELAXATION_ORDER = ['maxRuntime', 'minRating', 'language', 'platform'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function expandMoods(prefs) {
  const extra = (prefs.mood && MOOD_GENRE_MAP[prefs.mood]) || [];
  return [...new Set([...(prefs.genres || []), ...extra])];
}

// Canonical platform key (see utils/platforms.js) so UI / TMDB / seed spellings match.
function memberPlatforms(member) {
  return (member.preferences.platforms || []).map(platformKey);
}

// Members who listed no platforms have not constrained anything
function platformConstrained(members) {
  return members.some((m) => memberPlatforms(m).length > 0);
}

function sharedPlatforms(members, movie, majorityFraction, region) {
  const constrained = members.filter((m) => memberPlatforms(m).length > 0);
  const threshold = Math.ceil(constrained.length * (1 - majorityFraction));
  // Only look at the group's region when one is given; otherwise fall back to all regions.
  const providers = movie.providers || {};
  const regionProviders = region ? (providers[region] || []) : Object.values(providers).flat();
  const moviePlatforms = [...new Set(
    regionProviders
      .filter((p) => p.type === 'flatrate')
      .map((p) => p.name)
  )];

  if (moviePlatforms.length === 0) return [];

  const seen = new Set();
  return moviePlatforms.filter((platform) => {
    const key = platformKey(platform);
    if (seen.has(key)) return false;
    seen.add(key);
    const count = constrained.filter((m) => memberPlatforms(m).includes(key)).length;
    return count >= threshold;
  });
}

function normalize(value, min, max) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// Which hard constraints did the group actually set? Relaxing (or reporting) a
// constraint nobody set is meaningless and misleading.
function activeConstraints(members) {
  const prefs = members.map((m) => m.preferences);
  return new Set([
    prefs.some((p) => p.maxRuntime) && 'maxRuntime',
    prefs.some((p) => p.minRating > 0) && 'minRating',
    prefs.some((p) => (p.languages || []).length > 0) && 'language',
    platformConstrained(members) && 'platform',
  ].filter(Boolean));
}

// ─── Hard-constraint filter ───────────────────────────────────────────────────

function applyConstraints(members, candidates, relaxed = new Set(), region) {
  const maxRuntime = relaxed.has('maxRuntime')
    ? Infinity
    : Math.min(...members.map((m) => m.preferences.maxRuntime || Infinity));

  const minRating = relaxed.has('minRating')
    ? 0
    : Math.max(...members.map((m) => m.preferences.minRating || 0));

  const allLanguages = members.flatMap((m) => m.preferences.languages || []);
  const languageSet = new Set(allLanguages.map((l) => l.toLowerCase()));

  return candidates.filter((movie) => {
    if (!relaxed.has('maxRuntime') && movie.runtime > maxRuntime) return false;
    if (!relaxed.has('minRating') && movie.rating < minRating) return false;
    if (!relaxed.has('language') && languageSet.size > 0 && !languageSet.has((movie.language || '').toLowerCase())) return false;
    if (!relaxed.has('platform') && platformConstrained(members)) {
      const shared = sharedPlatforms(members, movie, PLATFORM_MAJORITY, region);
      if (shared.length === 0) return false;
    }
    return true;
  });
}

// ─── Soft scoring ─────────────────────────────────────────────────────────────

function scoreMovie(movie, members, ratingRange, popularityRange) {
  const memberCount = members.length;

  // Genre overlap: how many members have ≥1 matching genre
  const membersWithGenreMatch = members.filter((m) => {
    const wantedGenres = expandMoods(m.preferences).map((g) => g.toLowerCase());
    return (movie.genres || []).some((g) => wantedGenres.includes(g.toLowerCase()));
  });
  const genreScore = membersWithGenreMatch.length / memberCount;

  // Normalised rating (0–10 scale)
  const ratingScore = normalize(movie.rating || 0, ratingRange.min, ratingRange.max);

  // Normalised popularity
  const popularityScore = normalize(movie.popularity || 0, popularityRange.min, popularityRange.max);

  // Fairness: how well the *least* satisfied member is served (max-min fairness).
  // A member's satisfaction = share of their wanted genres the movie covers.
  // Distinct from genreOverlap (which only counts how many members match at all).
  const fairnessScore = Math.min(...members.map((m) => {
    const wanted = expandMoods(m.preferences).map((g) => g.toLowerCase());
    if (!wanted.length) return 1; // no genre preference -> cannot be dissatisfied
    const have = (movie.genres || []).map((g) => g.toLowerCase());
    return wanted.filter((g) => have.includes(g)).length / wanted.length;
  }));

  const total =
    WEIGHTS.genreOverlap  * genreScore +
    WEIGHTS.rating        * ratingScore +
    WEIGHTS.popularity    * popularityScore +
    WEIGHTS.fairness      * fairnessScore;

  return { total, matchedMembers: membersWithGenreMatch.length };
}

function buildExplanation(movie, matchedMembers, memberCount, relaxed, sharedPlats) {
  const parts = [];
  parts.push(`Matches ${matchedMembers}/${memberCount} members' genres`);
  if (sharedPlats.length) {
    parts.push(`on ${sharedPlats.join(', ')}`);
  }
  if (movie.runtime) parts.push(`${movie.runtime} min`);
  if (movie.rating)  parts.push(`⭐ ${movie.rating.toFixed(1)}`);
  if (relaxed.size)  parts.push(`[relaxed: ${[...relaxed].join(', ')}]`);
  return parts.join(', ');
}

// ─── Main export ──────────────────────────────────────────────────────────────

function rankMovies(members, candidates, { region } = {}) {
  if (!members.length || !candidates.length) {
    return { rankedMovies: [], relaxedConstraints: [] };
  }

  const relaxed = new Set();
  let filtered = applyConstraints(members, candidates, relaxed, region);

  // Fallback: relax constraints one at a time until we have enough
  const active = activeConstraints(members);
  for (const constraint of RELAXATION_ORDER) {
    if (filtered.length >= TOP_N) break;
    if (!active.has(constraint)) continue; // nothing to relax
    relaxed.add(constraint);
    filtered = applyConstraints(members, candidates, relaxed, region);
  }

  if (filtered.length === 0) {
    return { rankedMovies: [], relaxedConstraints: [...relaxed] };
  }

  // Compute normalisation ranges over the filtered set
  const ratings     = filtered.map((m) => m.rating || 0);
  const popularities = filtered.map((m) => m.popularity || 0);
  const ratingRange     = { min: Math.min(...ratings),      max: Math.max(...ratings) };
  const popularityRange = { min: Math.min(...popularities), max: Math.max(...popularities) };

  const scored = filtered.map((movie) => {
    const { total, matchedMembers } = scoreMovie(movie, members, ratingRange, popularityRange);
    const sharedPlats = relaxed.has('platform') || !platformConstrained(members) ? [] : sharedPlatforms(members, movie, PLATFORM_MAJORITY, region);
    return {
      movie,
      score: total,
      matchedMembers,
      explanation: buildExplanation(movie, matchedMembers, members.length, relaxed, sharedPlats),
    };
  });

  // Sort descending by score, deterministic tie-break by tmdbId
  scored.sort((a, b) => b.score - a.score || a.movie.tmdbId - b.movie.tmdbId);

  return {
    rankedMovies: scored.slice(0, TOP_N),
    relaxedConstraints: [...relaxed],
  };
}

module.exports = { rankMovies, WEIGHTS, MOOD_GENRE_MAP, RELAXATION_ORDER };
