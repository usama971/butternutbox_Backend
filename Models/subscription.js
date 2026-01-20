const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  subscriptionStart: { type: Date, required: true },
  subscriptionEnd: { type: Date, required: true },
  frequency: { type: String },
  // status: { type: String },
  autoRenew: { type: Boolean, default: false },

  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  stripeSubscriptionId: { type: String, required: true },
  stripeCustomerId: { type: String, required: true },
  status: { type: String, enum: ["active", "paused", "cancelled"], default: "active" },
  frequencyDays: { type: Number, default: 14 },
  nextOrderDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
