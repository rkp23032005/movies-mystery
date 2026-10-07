const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createRoom, joinRoom, getRoom, submitPreferences,
  startVoting, castVote, revealRoom, getRoomHistory,
} = require('../controllers/roomController');
const {
  validateCreateRoom, validateJoinRoom, validatePreferences, validateVote,
} = require('../validators/roomValidators');

const router = express.Router();
router.use(protect);

router.get('/history',                 getRoomHistory);
router.post('/',                       validateCreateRoom,  createRoom);
router.post('/join',                   validateJoinRoom,    joinRoom);
router.get('/:code',                   getRoom);
router.put('/:code/preferences',       validatePreferences, submitPreferences);
router.post('/:code/start-voting',     startVoting);
router.post('/:code/vote',             validateVote,        castVote);
router.post('/:code/reveal',           revealRoom);

module.exports = router;
