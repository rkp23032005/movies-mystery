const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
  it('returns 200 with success true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('OK');
  });
});
