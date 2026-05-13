const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  waId: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  email: { type: String, default: null },
}, { timestamps: true });

module.exports = model('User', userSchema);
