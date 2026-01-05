const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  subscriptionStart: { type: Date, required: true },
  subscriptionEnd: { type: Date, required: true },
  frequency: { type: String },
  status: { type: String },
  autoRenew: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
