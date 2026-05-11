const { Schema, model } = require('mongoose');

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'completed', 'cleared'], default: 'active' },
  items: [{
    item: { type: Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, default: 1 },
  }],
  history: [{ role: String, content: String }],
}, { timestamps: true });

module.exports = model('Order', orderSchema);
