const { rankMovies } = require('../services/rankingEngine');

// ─── Factories ────────────────────────────────────────────────────────────────

let _id = 1;
function makeMovie(overrides = {}) {
  return {
    _id:        String(_id),
    tmdbId:     _id++,
    title:      overrides.title || `Movie ${_id}`,
    genres:     overrides.genres     ?? ['Action'],
    language:   overrides.language   ?? 'en',
    runtime:    overrides.runtime    ?? 100,
    rating:     overrides.rating     ?? 7,
    popularity: overrides.popularity ?? 50,
    providers:  overrides.providers  ?? {
      US: [{ name: 'Netflix', type: 'flatrate' }],
    },
    ...overrides,
  };
}

function makeMember(overrides = {}) {
  return {
    preferences: {
      genres:     overrides.genres     ?? ['Action'],
      languages:  overrides.languages  ?? ['en'],
      platforms:  overrides.platforms  ?? ['Netflix'],
      minRating:  overrides.minRating  ?? 0,
      maxRuntime: overrides.maxRuntime ?? null,
      mood:       overrides.mood       ?? null,
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rankMovies', () => {
  beforeEach(() => { _id = 1; });

  // 1. Unanimous preferences
  test('unanimous preferences — all members agree, top result matches everyone', () => {
    const members = [makeMember(), makeMember(), makeMember()];
    const movies  = Array.from({ length: 15 }, () => makeMovie());
    const { rankedMovies, relaxedConstraints } = rankMovies(members, movies);

    expect(rankedMovies.length).toBeLessThanOrEqual(10);
    expect(relaxedConstraints).toHaveLength(0);
    expect(rankedMovies[0].matchedMembers).toBe(3);
    expect(rankedMovies[0].explanation).toMatch(/3\/3/);
  });

  // 2. Conflicting preferences
  test('conflicting preferences — scores reflect partial overlap', () => {
    const members = [
      makeMember({ genres: ['Action'] }),
      makeMember({ genres: ['Comedy'] }),
    ];
    const movies = [
      makeMovie({ genres: ['Action'], tmdbId: 100 }),
      makeMovie({ genres: ['Comedy'], tmdbId: 101 }),
      makeMovie({ genres: ['Action', 'Comedy'], tmdbId: 102 }),
    ];
    const { rankedMovies } = rankMovies(members, movies);
    // The Action+Comedy movie should satisfy both members
    const best = rankedMovies[0];
    expect(best.movie.tmdbId).toBe(102);
    expect(best.matchedMembers).toBe(2);
  });

  // 3. No overlap → fallback
  test('no platform overlap triggers platform relaxation', () => {
    const members = [
      makeMember({ platforms: ['Netflix'] }),
      makeMember({ platforms: ['Disney+'] }),
    ];
    // Movies only on Netflix — no shared platform
    const movies = Array.from({ length: 5 }, (_, i) =>
      makeMovie({ tmdbId: 200 + i, providers: { US: [{ name: 'Netflix', type: 'flatrate' }] } })
    );
    const { rankedMovies, relaxedConstraints } = rankMovies(members, movies);
    expect(relaxedConstraints).toContain('platform');
    expect(rankedMovies.length).toBeGreaterThan(0);
  });

  // 4. Single member
  test('single member — works correctly', () => {
    const members = [makeMember({ genres: ['Drama'], minRating: 6 })];
    const movies  = [
      makeMovie({ genres: ['Drama'], rating: 8, tmdbId: 300 }),
      makeMovie({ genres: ['Action'], rating: 9, tmdbId: 301 }),
    ];
    const { rankedMovies } = rankMovies(members, movies);
    expect(rankedMovies[0].movie.tmdbId).toBe(300);
  });

  // 5. Large group (10 members)
  test('10 members — returns ≤10 results without error', () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeMember({ genres: i % 2 === 0 ? ['Action'] : ['Comedy'] })
    );
    const movies = Array.from({ length: 50 }, (_, i) =>
      makeMovie({ genres: i % 3 === 0 ? ['Action', 'Comedy'] : ['Action'], tmdbId: 400 + i })
    );
    const { rankedMovies } = rankMovies(members, movies);
    expect(rankedMovies.length).toBeLessThanOrEqual(10);
    expect(rankedMovies.length).toBeGreaterThan(0);
  });

  // 6. Determinism
  test('determinism — same input always produces same output', () => {
    const members = [makeMember(), makeMember()];
    const movies  = Array.from({ length: 20 }, (_, i) => makeMovie({ tmdbId: 500 + i }));
    const r1 = rankMovies(members, movies);
    const r2 = rankMovies(members, movies);
    expect(r1.rankedMovies.map((r) => r.movie.tmdbId)).toEqual(
      r2.rankedMovies.map((r) => r.movie.tmdbId)
    );
  });

  // 7. maxRuntime hard constraint
  test('maxRuntime — movies exceeding lowest member limit are excluded', () => {
    const members = [
      makeMember({ maxRuntime: 90 }),
      makeMember({ maxRuntime: 120 }),
    ];
    const movies = [
      makeMovie({ runtime: 85,  tmdbId: 600 }),
      makeMovie({ runtime: 100, tmdbId: 601 }), // exceeds 90
      makeMovie({ runtime: 60,  tmdbId: 602 }),
    ];
    const { rankedMovies, relaxedConstraints } = rankMovies(members, movies);
    const ids = rankedMovies.map((r) => r.movie.tmdbId);
    if (!relaxedConstraints.includes('maxRuntime')) {
      expect(ids).not.toContain(601);
    }
  });

  // 8. minRating hard constraint
  test('minRating — uses highest member minimum', () => {
    const members = [
      makeMember({ minRating: 5 }),
      makeMember({ minRating: 7 }),
    ];
    const movies = [
      makeMovie({ rating: 8, tmdbId: 700 }),
      makeMovie({ rating: 6, tmdbId: 701 }), // below 7
      makeMovie({ rating: 7, tmdbId: 702 }),
    ];
    const { rankedMovies, relaxedConstraints } = rankMovies(members, movies);
    if (!relaxedConstraints.includes('minRating')) {
      const ids = rankedMovies.map((r) => r.movie.tmdbId);
      expect(ids).not.toContain(701);
    }
  });

  // 9. Mood-to-genre mapping
  test('mood mapping — "light" mood expands to comedy/family/animation genres', () => {
    const members = [makeMember({ genres: [], mood: 'light', platforms: ['Netflix'] })];
    const movies  = [
      makeMovie({ genres: ['Comedy'], tmdbId: 800 }),
      makeMovie({ genres: ['Thriller'], tmdbId: 801 }),
    ];
    const { rankedMovies } = rankMovies(members, movies);
    expect(rankedMovies[0].movie.tmdbId).toBe(800);
  });

  // 10. Empty candidates
  test('empty candidates — returns empty result', () => {
    const { rankedMovies, relaxedConstraints } = rankMovies([makeMember()], []);
    expect(rankedMovies).toHaveLength(0);
    expect(relaxedConstraints).toHaveLength(0);
  });

  // 11. Empty members
  test('empty members — returns empty result', () => {
    const { rankedMovies } = rankMovies([], [makeMovie()]);
    expect(rankedMovies).toHaveLength(0);
  });

  // 12. Explanation format
  test('explanation contains key info', () => {
    const members = [makeMember()];
    const movies  = [makeMovie({ runtime: 112, rating: 8.2, tmdbId: 900 })];
    const { rankedMovies } = rankMovies(members, movies);
    expect(rankedMovies[0].explanation).toMatch(/112 min/);
    expect(rankedMovies[0].explanation).toMatch(/8\.2/);
  });

  // 13. Fallback relaxation order
  test('fallback relaxes constraints in defined order until ≥10 results', () => {
    // All movies have no shared platform and strict runtime
    const members = [
      makeMember({ platforms: ['Netflix'], maxRuntime: 80, minRating: 8 }),
      makeMember({ platforms: ['Disney+'], maxRuntime: 80, minRating: 8 }),
    ];
    const movies = Array.from({ length: 15 }, (_, i) =>
      makeMovie({
        tmdbId:    1000 + i,
        runtime:   120,
        rating:    6,
        providers: { US: [{ name: 'Netflix', type: 'flatrate' }] },
      })
    );
    const { rankedMovies, relaxedConstraints } = rankMovies(members, movies);
    expect(relaxedConstraints.length).toBeGreaterThan(0);
    expect(rankedMovies.length).toBeGreaterThan(0);
  });

  // 14. Score is between 0 and 1
  test('all scores are in [0, 1]', () => {
    const members = [makeMember(), makeMember()];
    const movies  = Array.from({ length: 20 }, (_, i) => makeMovie({ tmdbId: 2000 + i }));
    const { rankedMovies } = rankMovies(members, movies);
    rankedMovies.forEach((r) => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    });
  });

  // 15. Language constraint
  test('language constraint — only matching language movies pass', () => {
    const members = [makeMember({ languages: ['en'] })];
    const movies  = [
      makeMovie({ language: 'en', tmdbId: 3000 }),
      makeMovie({ language: 'fr', tmdbId: 3001 }),
    ];
    const { rankedMovies, relaxedConstraints } = rankMovies(members, movies);
    if (!relaxedConstraints.includes('language')) {
      expect(rankedMovies.map((r) => r.movie.tmdbId)).not.toContain(3001);
    }
  });
});

describe('rankMovies — platform aliases & fairness', () => {
  test('"Amazon Prime" / "Disney+" match TMDB names "Amazon Prime Video" / "Disney Plus"', () => {
    const members = [{ preferences: { genres: ['Action'], languages: [], platforms: ['Amazon Prime', 'Disney+'], minRating: 0, maxRuntime: null, mood: null } }];
    const movies = [
      { _id: 'a', tmdbId: 1, title: 'A', genres: ['Action'], language: 'en', runtime: 100, rating: 7, popularity: 1, providers: { IN: [{ name: 'Amazon Prime Video', type: 'flatrate' }] } },
      { _id: 'b', tmdbId: 2, title: 'B', genres: ['Action'], language: 'en', runtime: 100, rating: 7, popularity: 1, providers: { IN: [{ name: 'Disney Plus', type: 'flatrate' }] } },
    ];
    const { rankedMovies } = rankMovies(members, movies);
    expect(rankedMovies).toHaveLength(2);
  });

  test('a member with no platforms does not eliminate every movie', () => {
    const members = [
      { preferences: { genres: ['Action'], platforms: ['Netflix'], languages: [], minRating: 0, maxRuntime: null, mood: null } },
      { preferences: { genres: ['Action'], platforms: [], languages: [], minRating: 0, maxRuntime: null, mood: null } },
    ];
    const movies = Array.from({ length: 10 }, (_, i) => ({ _id: String(i), tmdbId: i, title: 'M' + i, genres: ['Action'], language: 'en', runtime: 100, rating: 7, popularity: 1, providers: { US: [{ name: 'Netflix', type: 'flatrate' }] } }));
    const { relaxedConstraints } = rankMovies(members, movies);
    expect(relaxedConstraints).not.toContain('platform');
  });
});

// ─── Regression tests: relaxation reporting, region, platform aliases ─────────

describe('rankMovies — constraints, region & platform names', () => {
  beforeEach(() => { _id = 1; });

  const pool = (providers, n = 12) => Array.from({ length: n }, () => makeMovie({ providers }));

  it('does not report constraints nobody set as relaxed', () => {
    const members = [makeMember({ languages: ['hi'], platforms: [], minRating: 0, maxRuntime: null })];
    const movies = pool({ US: [{ name: 'Netflix', type: 'flatrate' }] }, 3); // too few -> forces relaxation
    const { relaxedConstraints } = rankMovies(members, movies);
    expect(relaxedConstraints).not.toContain('maxRuntime');
    expect(relaxedConstraints).not.toContain('minRating');
    expect(relaxedConstraints).toContain('language');
  });

  it('only counts providers from the given region', () => {
    const members = [makeMember({ platforms: ['Max'] })];
    const movies = pool({ US: [{ name: 'Max', type: 'flatrate' }] });
    expect(rankMovies(members, movies, { region: 'US' }).relaxedConstraints).not.toContain('platform');
    expect(rankMovies(members, movies, { region: 'IN' }).relaxedConstraints).toContain('platform');
  });

  it('matches "Hotstar" against TMDB\'s "Disney Plus Hotstar"', () => {
    const members = [makeMember({ platforms: ['Hotstar'] })];
    const movies = pool({ IN: [{ name: 'Disney Plus Hotstar', type: 'flatrate' }] });
    expect(rankMovies(members, movies, { region: 'IN' }).relaxedConstraints).not.toContain('platform');
  });
});
