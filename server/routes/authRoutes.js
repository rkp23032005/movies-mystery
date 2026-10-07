const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, me);

module.exports = router;
