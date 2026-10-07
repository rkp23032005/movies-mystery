const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
  if (!error) return next();
  const errors = error.details.map((d) => d.message);
  return res.status(400).json({ success: false, message: 'Validation failed', errors });
};

const createRoomSchema = Joi.object({
  mode: Joi.string().valid('normal', 'mystery').default('normal'),
});

const joinRoomSchema = Joi.object({
  code: Joi.string().length(6).uppercase().required(),
});

const preferencesSchema = Joi.object({
  genres:     Joi.array().items(Joi.string().max(50)).max(20),
  languages:  Joi.array().items(Joi.string().max(10)).max(20),
  platforms:  Joi.array().items(Joi.string().max(50)).max(20),
  minRating:  Joi.number().min(0).max(10),
  maxRuntime: Joi.number().min(30).max(600).allow(null),
  mood:       Joi.string().valid('light','dark','romantic','adventurous','thoughtful','scary').allow(null,''),
});

const voteSchema = Joi.object({
  movieId: Joi.string().hex().length(24).required(),
});

module.exports = {
  validateCreateRoom:   validate(createRoomSchema),
  validateJoinRoom:     validate(joinRoomSchema),
  validatePreferences:  validate(preferencesSchema),
  validateVote:         validate(voteSchema),
};
