const { Schema, model } = require('mongoose');

const preferenceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemName: { type: String, required: true },
  item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
}, { timestamps: true });

preferenceSchema.index({ user: 1, itemName: 1 }, { unique: true });

module.exports = model('Preference', preferenceSchema);
