const mongoose = require("mongoose");

const CheckoutSessionSchema = new mongoose.Schema({
  sessionId: String,
  payload: Object,
  isProcessed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("CheckoutSession", CheckoutSessionSchema);
