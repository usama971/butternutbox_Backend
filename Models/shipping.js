const mongoose = require('mongoose');

const ShippingSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', unique: true, required: true },
  shippingAddress: { type: String },
  shippingCity: { type: String },
  shippingState: { type: String },
  shippingPostalCode: { type: String },
  shippingCountry: { type: String },
  trackingNumber: { type: String, unique: true },
  shippingCompany: { type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Shipping', ShippingSchema);
