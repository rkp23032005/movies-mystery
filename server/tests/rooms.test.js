const request = require('supertest');
const app  = require('../app');
const db   = require('./helpers/db');
const Movie = require('../models/Movie');
const Room  = require('../models/Room');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reg = async (email, name = 'User') => {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'pass1234' });
  return { token: res.body.token, user: res.body.user };
};

const seedMovie = (overrides = {}) =>
  Movie.create({
    tmdbId: Math.floor(Math.random() * 1e9),
    title: 'Test Movie', genres: ['Action'], language: 'en',
    rating: 7.5, popularity: 100, releaseYear: 2020, runtime: 120,
    providers: { US: [{ name: 'Netflix', type: 'flatrate' }] },
    lastSyncedAt: new Date(), ...overrides,
  });

// Seed a room already in voting state with a real shortlist entry
async function seedVotingRoom({ mode = 'normal' } = {}) {
  const host   = await reg('host@t.com', 'Host');
  const member = await reg('member@t.com', 'Member');
  const movie  = await seedMovie();

  const room = await Room.create({
    code: 'ABCDEF',
    host: host.user._id,
    mode,
    status: 'voting',
    members: [
      { user: host.user._id,   preferencesSubmitted: true },
      { user: member.user._id, preferencesSubmitted: true },
    ],
    shortlist: [{ movie: movie._id, score: 0.8, matchedMembers: 2, explanation: 'test' }],
  });
  return { host, member, movie, room };
}

// ─── POST /api/rooms ──────────────────────────────────────────────────────────

describe('POST /api/rooms', () => {
  it('creates a room with a 6-char code', async () => {
    const { token } = await reg('a@t.com');
    const res = await request(app).post('/api/rooms').set('Authorization', `Bearer ${token}`).send({ mode: 'normal' });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toHaveLength(6);
    expect(res.body.data.mode).toBe('normal');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/rooms').send({});
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/rooms/join ─────────────────────────────────────────────────────

describe('POST /api/rooms/join', () => {
  it('lets a second user join a lobby room', async () => {
    const host   = await reg('h@t.com');
    const joiner = await reg('j@t.com');
    const create = await request(app).post('/api/rooms').set('Authorization', `Bearer ${host.token}`).send({});
    const code = create.body.data.code;

    const res = await request(app).post('/api/rooms/join').set('Authorization', `Bearer ${joiner.token}`).send({ code });
    expect(res.status).toBe(200);
    expect(res.body.data.members).toHaveLength(2);
  });

  it('rejects joining a non-lobby room', async () => {
    const { host } = await seedVotingRoom();
    const joiner = await reg('j2@t.com');
    const res = await request(app).post('/api/rooms/join').set('Authorization', `Bearer ${joiner.token}`).send({ code: 'ABCDEF' });
    expect(res.status).toBe(409);
  });

  it('is idempotent — rejoining does not duplicate member', async () => {
    const host = await reg('h2@t.com');
    const create = await request(app).post('/api/rooms').set('Authorization', `Bearer ${host.token}`).send({});
    const code = create.body.data.code;
    await request(app).post('/api/rooms/join').set('Authorization', `Bearer ${host.token}`).send({ code });
    const res = await request(app).get(`/api/rooms/${code}`).set('Authorization', `Bearer ${host.token}`);
    expect(res.body.data.members).toHaveLength(1);
  });
});

// ─── POST /api/rooms/:code/vote ───────────────────────────────────────────────

describe('POST /api/rooms/:code/vote', () => {
  it('records a vote', async () => {
    const { host, movie } = await seedVotingRoom();
    const res = await request(app)
      .post('/api/rooms/ABCDEF/vote')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ movieId: movie._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.data.voteCounts[movie._id.toString()]).toBe(1);
  });

  it('allows updating a vote (upsert)', async () => {
    const { host, movie } = await seedVotingRoom();
    const movie2 = await seedMovie({ tmdbId: 99999 });
    // Add movie2 to shortlist
    await Room.updateOne({ code: 'ABCDEF' }, { $push: { shortlist: { movie: movie2._id, score: 0.5, matchedMembers: 1, explanation: 'x' } } });

    await request(app).post('/api/rooms/ABCDEF/vote').set('Authorization', `Bearer ${host.token}`).send({ movieId: movie._id.toString() });
    const res = await request(app).post('/api/rooms/ABCDEF/vote').set('Authorization', `Bearer ${host.token}`).send({ movieId: movie2._id.toString() });
    expect(res.status).toBe(200);
    // Only one vote for this user
    const total = Object.values(res.body.data.voteCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
  });

  it('rejects voting for a movie not on the shortlist', async () => {
    const { host } = await seedVotingRoom();
    const other = await seedMovie({ tmdbId: 77777 });
    const res = await request(app)
      .post('/api/rooms/ABCDEF/vote')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ movieId: other._id.toString() });
    expect(res.status).toBe(400);
  });

  it('rejects voting outside voting phase', async () => {
    const { token } = await reg('x@t.com');
    const create = await request(app).post('/api/rooms').set('Authorization', `Bearer ${token}`).send({});
    const code = create.body.data.code;
    const movie = await seedMovie({ tmdbId: 55555 });
    const res = await request(app).post(`/api/rooms/${code}/vote`).set('Authorization', `Bearer ${token}`).send({ movieId: movie._id.toString() });
    expect(res.status).toBe(409);
  });

  it('rejects non-members from voting', async () => {
    const { movie } = await seedVotingRoom();
    const outsider = await reg('out@t.com');
    const res = await request(app)
      .post('/api/rooms/ABCDEF/vote')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ movieId: movie._id.toString() });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/rooms/:code/reveal ─────────────────────────────────────────────

describe('POST /api/rooms/:code/reveal', () => {
  it('host can reveal and result is set', async () => {
    const { host, movie } = await seedVotingRoom();
    // Cast a vote first
    await request(app).post('/api/rooms/ABCDEF/vote').set('Authorization', `Bearer ${host.token}`).send({ movieId: movie._id.toString() });
    const res = await request(app).post('/api/rooms/ABCDEF/reveal').set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('revealed');
    expect(res.body.data.result).toBeTruthy();
  });

  it('non-host cannot reveal', async () => {
    const { member } = await seedVotingRoom();
    const res = await request(app).post('/api/rooms/ABCDEF/reveal').set('Authorization', `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });

  it('cannot reveal from wrong state', async () => {
    const { token } = await reg('s@t.com');
    const create = await request(app).post('/api/rooms').set('Authorization', `Bearer ${token}`).send({});
    const code = create.body.data.code;
    const res = await request(app).post(`/api/rooms/${code}/reveal`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('tie-break: equal votes → higher engine score wins', async () => {
    const host   = await reg('tb_h@t.com', 'Host');
    const member = await reg('tb_m@t.com', 'Member');
    const m1 = await seedMovie({ tmdbId: 11111 });
    const m2 = await seedMovie({ tmdbId: 22222 });

    await Room.create({
      code: 'TIEBRK',
      host: host.user._id,
      status: 'voting',
      members: [{ user: host.user._id }, { user: member.user._id }],
      shortlist: [
        { movie: m1._id, score: 0.9, matchedMembers: 2, explanation: 'a' },
        { movie: m2._id, score: 0.6, matchedMembers: 2, explanation: 'b' },
      ],
      votes: [
        { user: host.user._id,   movie: m1._id },
        { user: member.user._id, movie: m2._id },
      ],
    });

    const res = await request(app).post('/api/rooms/TIEBRK/reveal').set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    // m1 has higher score — should win the tie
    expect(res.body.data.result._id.toString()).toBe(m1._id.toString());
  });

  it('no votes → falls back to top engine score', async () => {
    const { host, movie } = await seedVotingRoom();
    const res = await request(app).post('/api/rooms/ABCDEF/reveal').set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.result._id.toString()).toBe(movie._id.toString());
  });
});

// ─── Mystery mode data hiding ─────────────────────────────────────────────────

describe('Mystery mode — data hiding', () => {
  it('hides title and poster before reveal', async () => {
    const { host } = await seedVotingRoom({ mode: 'mystery' });
    const res = await request(app).get('/api/rooms/ABCDEF').set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    const item = res.body.data.shortlist[0];
    expect(item.movie.title).toBeUndefined();
    expect(item.movie.posterPath).toBeUndefined();
    expect(item.movie.genres).toBeDefined();
    expect(item.movie.ratingBand).toBeDefined();
  });

  it('exposes full movie after reveal', async () => {
    const { host, movie } = await seedVotingRoom({ mode: 'mystery' });
    await request(app).post('/api/rooms/ABCDEF/vote').set('Authorization', `Bearer ${host.token}`).send({ movieId: movie._id.toString() });
    await request(app).post('/api/rooms/ABCDEF/reveal').set('Authorization', `Bearer ${host.token}`);

    const res = await request(app).get('/api/rooms/ABCDEF').set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.result).toBeTruthy();
    // shortlist items now have full movie
    const item = res.body.data.shortlist[0];
    expect(item.movie.title).toBeDefined();
  });

  it('normal mode always exposes title', async () => {
    const { host } = await seedVotingRoom({ mode: 'normal' });
    const res = await request(app).get('/api/rooms/ABCDEF').set('Authorization', `Bearer ${host.token}`);
    const item = res.body.data.shortlist[0];
    expect(item.movie.title).toBeDefined();
  });
});

// ─── GET /api/rooms/history ───────────────────────────────────────────────────

describe('GET /api/rooms/history', () => {
  it('returns only revealed rooms the user was in', async () => {
    const { host } = await seedVotingRoom();
    // Reveal it
    await request(app).post('/api/rooms/ABCDEF/reveal').set('Authorization', `Bearer ${host.token}`);

    const res = await request(app).get('/api/rooms/history').set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('revealed');
  });

  it('does not return rooms from other users', async () => {
    await seedVotingRoom();
    const outsider = await reg('out2@t.com');
    const res = await request(app).get('/api/rooms/history').set('Authorization', `Bearer ${outsider.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});
