const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const register = async ({ name, email, password }) => {
  const exists = await User.findOne({ email });
  if (exists) throw ApiError.badRequest('Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  const token = signToken(user._id);
  return { token, user: user.toSafeObject() };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const match = await user.comparePassword(password);
  if (!match) throw ApiError.unauthorized('Invalid credentials');

  const token = signToken(user._id);
  return { token, user: user.toSafeObject() };
};

const updateProfile = async (userId, fields) => {
  const update = {};
  if (fields.region !== undefined) update['profile.region'] = String(fields.region).toUpperCase();
  if (fields.languages !== undefined) update['profile.languages'] = fields.languages;
  if (fields.ownedPlatforms !== undefined) update['profile.ownedPlatforms'] = fields.ownedPlatforms;

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return user.toSafeObject();
};

module.exports = { register, login, updateProfile };
