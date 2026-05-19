const { Schema, model } = require('mongoose');

const storeSchema = new Schema({
  name: { type: String, required: true },
  chain: { type: String },
  address: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
}, { timestamps: true });

storeSchema.index({ location: '2dsphere' });

module.exports = model('Store', storeSchema);
