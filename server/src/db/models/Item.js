const { Schema, model } = require('mongoose');

const itemSchema = new Schema({
  name: { type: String, required: true },
  store: { type: String },
  price: { type: Number },
  variant: {
    brand: { type: String },
    size: { type: String },
    unit: { type: String },
  },
  tags: [{ type: String }],
}, { timestamps: true });

itemSchema.index({ name: 'text', tags: 'text' });

module.exports = model('Item', itemSchema);
