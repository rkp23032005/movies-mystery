const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 25000,
  params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
});

// Retry up to 3 times on 429 (rate-limit) or transient network errors/timeouts
tmdb.interceptors.response.use(null, async (err) => {
  const config = err.config;
  if (!config) return Promise.reject(err);

  config._retryCount = config._retryCount || 0;
  const isRateLimit = err.response?.status === 429;
  const isNetworkOrTimeout = err.code === 'ECONNABORTED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || !err.response;

  if ((isRateLimit || isNetworkOrTimeout) && config._retryCount < 3) {
    config._retryCount += 1;
    const wait = isRateLimit
      ? (parseInt(err.response?.headers?.['retry-after'] ?? '2', 10) + 1) * 1000
      : config._retryCount * 1500;
    await new Promise((r) => setTimeout(r, wait));
    return tmdb(config);
  }
  return Promise.reject(err);
});

const get = (path, params = {}) => tmdb.get(path, { params }).then((r) => r.data);

module.exports = { get };
