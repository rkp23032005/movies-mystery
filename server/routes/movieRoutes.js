const express = require('express');
const { listMovies, getMovie, getFilterMeta } = require('../controllers/movieController');

const router = express.Router();

// Order matters: /meta/filters must come before /:id
router.get('/meta/filters', getFilterMeta);
router.get('/', listMovies);
router.get('/:id', getMovie);

module.exports = router;
