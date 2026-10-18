const asyncHandler = require('../utils/asyncHandler');
const { size: cacheSize } = require('../utils/ramCache');

const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString(),
    ramCacheEntries: cacheSize(),
  });
});

module.exports = { healthCheck };
