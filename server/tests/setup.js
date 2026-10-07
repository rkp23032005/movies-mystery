// Runs before every test file. Tests must not depend on a (gitignored) local .env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-at-least-32-characters-long';
