const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  waId: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  email: { type: String, default: null },
  locations: [{
    name: { type: String },
    coordinates: { type: [Number] },
    lastUsedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = model('User', userSchema);
