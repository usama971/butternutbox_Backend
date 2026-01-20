const mongoose = require("mongoose");

const PendingCheckoutSchema = new mongoose.Schema({
  payload: { type: Object, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "usd" },
  status: {
    type: String,
    enum: ["pending", "completed", "expired"],
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("PendingCheckout", PendingCheckoutSchema);
