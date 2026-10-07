const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const Movie = require('../models/Movie');

beforeAll(async () => {
  await db.connect();
  // Ensure indexes (including text index) are created in the in-memory instance
  await Movie.ensureIndexes();
  await Movie.insertMany(fixtures);
});
afterAll(() => db.disconnect());

const BASE = '/api/movies';

// ── fixtures ──────────────────────────────────────────────────────────────────
const fixtures = [
  {
    tmdbId: 1, title: 'Action Hero', overview: 'Explosions everywhere',
    genres: ['Action'], language: 'en', runtime: 120, releaseYear: 2020,
    rating: 7.5, popularity: 900,
    posterPath: '/a.jpg', backdropPath: '/ab.jpg',
    providers: { IN: [{ name: 'Netflix', type: 'flatrate' }] },
    lastSyncedAt: new Date(),
  },
  {
    tmdbId: 2, title: 'Drama Queen', overview: 'A touching story',
    genres: ['Drama'], language: 'hi', runtime: 150, releaseYear: 2018,
    rating: 8.2, popularity: 700,
    posterPath: '/b.jpg', backdropPath: '/bb.jpg',
    providers: { IN: [{ name: 'Prime Video', type: 'flatrate' }] },
    lastSyncedAt: new Date(),
  },
  {
    tmdbId: 3, title: 'Comedy Night', overview: 'Laugh out loud',
    genres: ['Comedy'], language: 'en', runtime: 95, releaseYear: 2022,
    rating: 6.8, popularity: 500,
    posterPath: '/c.jpg', backdropPath: '/cb.jpg',
    providers: { IN: [{ name: 'Netflix', type: 'flatrate' }] },
    lastSyncedAt: new Date(),
  },
  {
    tmdbId: 4, title: 'Sci-Fi Adventure', overview: 'Space exploration',
    genres: ['Action', 'Science Fiction'], language: 'en', runtime: 180, releaseYear: 2015,
    rating: 9.0, popularity: 1200,
    posterPath: '/d.jpg', backdropPath: '/db.jpg',
    providers: { US: [{ name: 'Disney+', type: 'flatrate' }] },
    lastSyncedAt: new Date(),
  },
  {
    tmdbId: 5, title: 'Hindi Drama', overview: 'Emotional journey',
    genres: ['Drama', 'Romance'], language: 'hi', runtime: 160, releaseYear: 2010,
    rating: 7.0, popularity: 400,
    posterPath: '/e.jpg', backdropPath: '/eb.jpg',
    providers: {},
    lastSyncedAt: new Date(),
  },
];

// ── list / pagination ─────────────────────────────────────────────────────────
describe('GET /api/movies', () => {
  it('returns all movies with pagination metadata', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(res.body.pagination.total).toBe(5);
  });

  it('respects page and limit', async () => {
    const res = await request(app).get(`${BASE}?page=1&limit=2`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it('page 2 returns different movies than page 1', async () => {
    const p1 = await request(app).get(`${BASE}?page=1&limit=2`);
    const p2 = await request(app).get(`${BASE}?page=2&limit=2`);
    const ids1 = p1.body.data.map((m) => m.tmdbId);
    const ids2 = p2.body.data.map((m) => m.tmdbId);
    expect(ids1).not.toEqual(ids2);
  });
});

// ── text search ───────────────────────────────────────────────────────────────
describe('GET /api/movies?q=', () => {
  it('finds movies by title keyword', async () => {
    const res = await request(app).get(`${BASE}?q=Action`);
    expect(res.status).toBe(200);
    const titles = res.body.data.map((m) => m.title);
    expect(titles.some((t) => t.includes('Action'))).toBe(true);
  });

  it('returns empty data for unmatched query', async () => {
    const res = await request(app).get(`${BASE}?q=xyznonexistent`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});

// ── genre filter ──────────────────────────────────────────────────────────────
describe('GET /api/movies?genre=', () => {
  it('filters by single genre', async () => {
    const res = await request(app).get(`${BASE}?genre=Drama`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => expect(m.genres).toContain('Drama'));
  });

  it('filters by multiple genres (comma-separated)', async () => {
    const res = await request(app).get(`${BASE}?genre=Action,Comedy`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) =>
      expect(m.genres.some((g) => ['Action', 'Comedy'].includes(g))).toBe(true)
    );
  });
});

// ── language filter ───────────────────────────────────────────────────────────
describe('GET /api/movies?language=', () => {
  it('filters by language', async () => {
    const res = await request(app).get(`${BASE}?language=hi`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => expect(m.language).toBe('hi'));
    expect(res.body.pagination.total).toBe(2);
  });
});

// ── rating filter ─────────────────────────────────────────────────────────────
describe('GET /api/movies?minRating=', () => {
  it('filters by minimum rating', async () => {
    const res = await request(app).get(`${BASE}?minRating=8`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => expect(m.rating).toBeGreaterThanOrEqual(8));
  });
});

// ── runtime filter ────────────────────────────────────────────────────────────
describe('GET /api/movies?maxRuntime=', () => {
  it('filters by max runtime', async () => {
    const res = await request(app).get(`${BASE}?maxRuntime=100`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => expect(m.runtime).toBeLessThanOrEqual(100));
  });
});

// ── year filter ───────────────────────────────────────────────────────────────
describe('GET /api/movies?yearFrom=&yearTo=', () => {
  it('filters by year range', async () => {
    const res = await request(app).get(`${BASE}?yearFrom=2018&yearTo=2022`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => {
      expect(m.releaseYear).toBeGreaterThanOrEqual(2018);
      expect(m.releaseYear).toBeLessThanOrEqual(2022);
    });
  });
});

// ── platform filter ───────────────────────────────────────────────────────────
describe('GET /api/movies?platform=&region=', () => {
  it('filters by platform in region', async () => {
    const res = await request(app).get(`${BASE}?platform=Netflix&region=IN`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(2); // Action Hero + Comedy Night
  });

  it('returns 0 for platform not in region', async () => {
    const res = await request(app).get(`${BASE}?platform=Disney%2B&region=IN`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(0);
  });
});

// ── combined filters ──────────────────────────────────────────────────────────
describe('combined filters', () => {
  it('genre + language + minRating', async () => {
    const res = await request(app).get(`${BASE}?genre=Drama&language=hi&minRating=7`);
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => {
      expect(m.genres).toContain('Drama');
      expect(m.language).toBe('hi');
      expect(m.rating).toBeGreaterThanOrEqual(7);
    });
  });
});

// ── sort ──────────────────────────────────────────────────────────────────────
describe('sortBy', () => {
  it('sorts by rating desc', async () => {
    const res = await request(app).get(`${BASE}?sortBy=rating&order=desc`);
    const ratings = res.body.data.map((m) => m.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it('sorts by year asc', async () => {
    const res = await request(app).get(`${BASE}?sortBy=year&order=asc`);
    const years = res.body.data.map((m) => m.releaseYear);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

// ── meta/filters ──────────────────────────────────────────────────────────────
describe('GET /api/movies/meta/filters', () => {
  it('returns genres, languages, platforms', async () => {
    const res = await request(app).get(`${BASE}/meta/filters`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.genres)).toBe(true);
    expect(Array.isArray(res.body.languages)).toBe(true);
    expect(Array.isArray(res.body.platforms)).toBe(true);
    expect(res.body.genres).toContain('Action');
    expect(res.body.platforms).toContain('Netflix');
  });
});
