const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (!error) return next();
  const errors = error.details.map((d) => d.message);
  return res.status(400).json({ success: false, message: 'Validation failed', errors });
};

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const profileSchema = Joi.object({
  region: Joi.string().length(2).uppercase(),
  languages: Joi.array().items(Joi.string()),
  ownedPlatforms: Joi.array().items(Joi.string()),
}).min(1);

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateProfile: validate(profileSchema),
};
