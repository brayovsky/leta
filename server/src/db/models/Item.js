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

itemSchema.index(
  { name: 'text', 'variant.brand': 'text', store: 'text', 'variant.size': 'text', 'variant.unit': 'text', tags: 'text' },
  { weights: { name: 10, 'variant.brand': 8, tags: 6, store: 5, 'variant.size': 4, 'variant.unit': 4 } }
);

module.exports = model('Item', itemSchema);
