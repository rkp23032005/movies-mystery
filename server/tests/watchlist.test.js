const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const Movie = require('../models/Movie');
const Watchlist = require('../models/Watchlist');

beforeAll(async () => {
  await db.connect();
  await Movie.ensureIndexes();
});
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// ── helpers ───────────────────────────────────────────────────────────────────
const registerAndLogin = async (email = 'u@test.com') => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'User', email, password: 'pass1234' });
  return res.body.token;
};

const seedMovie = (overrides = {}) =>
  Movie.create({
    tmdbId: Math.floor(Math.random() * 1e9),
    title: 'Test Movie',
    genres: ['Action'],
    language: 'en',
    rating: 7.5,
    popularity: 100,
    releaseYear: 2020,
    runtime: 120,
    providers: { IN: [{ name: 'Netflix', type: 'flatrate' }] },
    lastSyncedAt: new Date(),
    ...overrides,
  });

// ── add ───────────────────────────────────────────────────────────────────────
describe('POST /api/watchlist/:movieId', () => {
  it('adds a movie and returns 201', async () => {
    const token = await registerAndLogin();
    const movie = await seedMovie();
    const res = await request(app)
      .post(`/api/watchlist/${movie._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 on duplicate add', async () => {
    const token = await registerAndLogin();
    const movie = await seedMovie();
    await request(app).post(`/api/watchlist/${movie._id}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/watchlist/${movie._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent movie', async () => {
    const token = await registerAndLogin();
    const fakeId = '64a1b2c3d4e5f6a7b8c9d0e1';
    const res = await request(app)
      .post(`/api/watchlist/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const movie = await seedMovie();
    const res = await request(app).post(`/api/watchlist/${movie._id}`);
    expect(res.status).toBe(401);
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('DELETE /api/watchlist/:movieId', () => {
  it('removes a movie', async () => {
    const token = await registerAndLogin();
    const movie = await seedMovie();
    await request(app).post(`/api/watchlist/${movie._id}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .delete(`/api/watchlist/${movie._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 without token', async () => {
    const movie = await seedMovie();
    const res = await request(app).delete(`/api/watchlist/${movie._id}`);
    expect(res.status).toBe(401);
  });
});

// ── list ──────────────────────────────────────────────────────────────────────
describe('GET /api/watchlist', () => {
  it('returns saved movies', async () => {
    const token = await registerAndLogin();
    const movie = await seedMovie();
    await request(app).post(`/api/watchlist/${movie._id}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.movies.length).toBe(1);
    expect(res.body.movies[0].title).toBe('Test Movie');
  });

  it('filters by platform', async () => {
    const token = await registerAndLogin();
    const netflix = await seedMovie({ title: 'Netflix Movie', providers: { IN: [{ name: 'Netflix', type: 'flatrate' }] } });
    const prime   = await seedMovie({ title: 'Prime Movie',   providers: { IN: [{ name: 'Prime Video', type: 'flatrate' }] } });
    await request(app).post(`/api/watchlist/${netflix._id}`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/api/watchlist/${prime._id}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/watchlist?platform=Netflix&region=IN')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.movies.length).toBe(1);
    expect(res.body.movies[0].title).toBe('Netflix Movie');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/watchlist');
    expect(res.status).toBe(401);
  });

  it('two users have independent watchlists', async () => {
    const t1 = await registerAndLogin('a@test.com');
    const t2 = await registerAndLogin('b@test.com');
    const movie = await seedMovie();
    await request(app).post(`/api/watchlist/${movie._id}`).set('Authorization', `Bearer ${t1}`);

    const res = await request(app).get('/api/watchlist').set('Authorization', `Bearer ${t2}`);
    expect(res.body.movies.length).toBe(0);
  });
});
