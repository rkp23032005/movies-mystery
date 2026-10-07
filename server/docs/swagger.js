const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Movie Mystery API',
      version: '1.0.0',
      description:
        'Group movie-night decider with streaming availability, real-time voting, and mystery reveal.',
    },
    servers: [{ url: '/api', description: 'Current server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Alice' },
            email: { type: 'string', example: 'alice@example.com' },
            profile: {
              type: 'object',
              properties: {
                region: { type: 'string', example: 'US' },
                languages: { type: 'array', items: { type: 'string' }, example: ['en'] },
                ownedPlatforms: { type: 'array', items: { type: 'string' }, example: ['Netflix'] },
              },
            },
          },
        },
        Room: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            code: { type: 'string', example: 'A1B2C3' },
            mode: { type: 'string', enum: ['normal', 'mystery'] },
            status: { type: 'string', enum: ['lobby', 'preferences', 'voting', 'revealed'] },
            host: { type: 'string' },
            members: { type: 'array', items: { type: 'object' } },
            shortlist: { type: 'array', items: { type: 'object' } },
            relaxedConstraints: { type: 'array', items: { type: 'string' } },
            result: { type: 'object', nullable: true },
          },
        },
        Movie: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            tmdbId: { type: 'integer' },
            title: { type: 'string', example: 'Inception' },
            genres: { type: 'array', items: { type: 'string' }, example: ['Action', 'Sci-Fi'] },
            language: { type: 'string', example: 'en' },
            runtime: { type: 'integer', example: 148 },
            rating: { type: 'number', example: 8.8 },
            popularity: { type: 'number', example: 120.5 },
            posterPath: { type: 'string', example: '/poster.jpg' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Alice' },
                    email: { type: 'string', example: 'alice@example.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'alice@example.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Token returned' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          responses: {
            200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/users/profile': {
        patch: {
          tags: ['Users'],
          summary: 'Update profile (region, languages, platforms)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    region: { type: 'string', example: 'US' },
                    languages: { type: 'array', items: { type: 'string' }, example: ['en'] },
                    ownedPlatforms: { type: 'array', items: { type: 'string' }, example: ['Netflix'] },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated user' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/movies': {
        get: {
          tags: ['Movies'],
          summary: 'List / search movies',
          security: [],
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text search' },
            { name: 'genre', in: 'query', schema: { type: 'string' } },
            { name: 'language', in: 'query', schema: { type: 'string' } },
            { name: 'platform', in: 'query', schema: { type: 'string' } },
            { name: 'region', in: 'query', schema: { type: 'string' } },
            { name: 'yearFrom', in: 'query', schema: { type: 'integer' } },
            { name: 'yearTo', in: 'query', schema: { type: 'integer' } },
            { name: 'minRating', in: 'query', schema: { type: 'number' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Paginated movie list' } },
        },
      },
      '/movies/{id}': {
        get: {
          tags: ['Movies'],
          summary: 'Get movie by MongoDB ID',
          security: [],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Movie detail' }, 404: { description: 'Not found' } },
        },
      },
      '/movies/meta/filters': {
        get: {
          tags: ['Movies'],
          summary: 'Get available filter options (genres, languages, platforms)',
          security: [],
          responses: { 200: { description: 'Filter metadata' } },
        },
      },
      '/watchlist/{movieId}': {
        post: {
          tags: ['Watchlist'],
          summary: 'Add movie to watchlist',
          parameters: [{ name: 'movieId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 201: { description: 'Added' }, 400: { description: 'Already in watchlist' } },
        },
        delete: {
          tags: ['Watchlist'],
          summary: 'Remove movie from watchlist',
          parameters: [{ name: 'movieId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Removed' } },
        },
      },
      '/watchlist': {
        get: {
          tags: ['Watchlist'],
          summary: 'Get watchlist',
          parameters: [
            { name: 'platform', in: 'query', schema: { type: 'string' } },
            { name: 'region', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Watchlist movies' } },
        },
      },
      '/rooms': {
        post: {
          tags: ['Rooms'],
          summary: 'Create a room',
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { mode: { type: 'string', enum: ['normal', 'mystery'], default: 'normal' } } },
              },
            },
          },
          responses: { 201: { description: 'Room created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } } },
        },
      },
      '/rooms/join': {
        post: {
          tags: ['Rooms'],
          summary: 'Join a room by invite code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['code'], properties: { code: { type: 'string', example: 'A1B2C3' } } },
              },
            },
          },
          responses: {
            200: { description: 'Joined room' },
            404: { description: 'Room not found' },
            409: { description: 'Room not in lobby state' },
          },
        },
      },
      '/rooms/history': {
        get: {
          tags: ['Rooms'],
          summary: 'Get revealed rooms the user participated in',
          responses: { 200: { description: 'Array of past rooms with winning movie' } },
        },
      },
      '/rooms/{code}': {
        get: {
          tags: ['Rooms'],
          summary: 'Get room state (mystery mode hides title/poster until reveal)',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Room state' }, 403: { description: 'Not a member' } },
        },
      },
      '/rooms/{code}/preferences': {
        put: {
          tags: ['Rooms'],
          summary: 'Submit member preferences',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    genres: { type: 'array', items: { type: 'string' }, example: ['Action', 'Comedy'] },
                    languages: { type: 'array', items: { type: 'string' }, example: ['en'] },
                    platforms: { type: 'array', items: { type: 'string' }, example: ['Netflix'] },
                    minRating: { type: 'number', example: 7 },
                    maxRuntime: { type: 'integer', example: 120 },
                    mood: { type: 'string', example: 'light' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Preferences saved' }, 409: { description: 'Wrong phase' } },
        },
      },
      '/rooms/{code}/start-voting': {
        post: {
          tags: ['Rooms'],
          summary: 'Host only — run ranking engine and move to voting phase',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Shortlist returned' },
            403: { description: 'Host only' },
            409: { description: 'Wrong phase' },
          },
        },
      },
      '/rooms/{code}/vote': {
        post: {
          tags: ['Rooms'],
          summary: 'Cast or update a vote (one per member)',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['movieId'], properties: { movieId: { type: 'string' } } },
              },
            },
          },
          responses: {
            200: { description: 'Vote counts returned' },
            400: { description: 'Movie not on shortlist' },
            409: { description: 'Not in voting phase' },
          },
        },
      },
      '/rooms/{code}/reveal': {
        post: {
          tags: ['Rooms'],
          summary: 'Host only — tally votes, apply tie-break, reveal winner',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Full room with result populated' },
            403: { description: 'Host only' },
            409: { description: 'Not in voting phase' },
          },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
