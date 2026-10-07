const express = require('express');
const { add, remove, list } = require('../controllers/watchlistController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // all watchlist routes require auth

router.get('/', list);
router.post('/:movieId', add);
router.delete('/:movieId', remove);

module.exports = router;
