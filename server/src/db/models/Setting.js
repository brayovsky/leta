const { Schema, model } = require('mongoose');

// Simple key/value store for small pieces of global runtime config
// (e.g. whether conversations are handled by the AI agent or a human).
const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
}, { timestamps: true });

module.exports = model('Setting', settingSchema);
