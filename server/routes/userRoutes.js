const express = require('express');
const { updateProfile } = require('../controllers/authController');
const { validateProfile } = require('../validators/authValidators');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.patch('/profile', protect, validateProfile, updateProfile);

module.exports = router;
