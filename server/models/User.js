const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profile: {
      region: { type: String, default: 'IN' },
      languages: { type: [String], default: [] },
      ownedPlatforms: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const { _id, name, email, profile, createdAt } = this.toObject();
  return { _id, name, email, profile, createdAt };
};

module.exports = mongoose.model('User', userSchema);
