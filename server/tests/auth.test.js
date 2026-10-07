const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const BASE = '/api/auth';
const validUser = { name: 'Alice', email: 'alice@example.com', password: 'secret123' };

describe('POST /api/auth/register', () => {
  it('creates a user and returns token', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with 400', async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app).post(`${BASE}/register`).send(validUser);
    expect(res.status).toBe(400);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post(`${BASE}/register`).send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => request(app).post(`${BASE}/register`).send(validUser));

  it('returns token on valid credentials', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user for valid token', async () => {
    const reg = await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/profile', () => {
  it('updates profile fields', async () => {
    const reg = await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ region: 'US', languages: ['en'], ownedPlatforms: ['Netflix'] });
    expect(res.status).toBe(200);
    expect(res.body.user.profile.region).toBe('US');
    expect(res.body.user.profile.ownedPlatforms).toContain('Netflix');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/users/profile').send({ region: 'US' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty body', async () => {
    const reg = await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
