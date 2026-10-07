const asyncHandler = require('../utils/asyncHandler');

const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

module.exports = { healthCheck };
