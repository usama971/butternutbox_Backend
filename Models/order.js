const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    qty: { type: Number, default: 1 },
    ingredients: { type: Array, required: true },
  },
  { _id: false },
);
const starterBoxSchema = new mongoose.Schema(
  {
    starterQuantity: { type: Number, default: 1, required: true },
    price: { type: String, required: true },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    orderItems: { type: [OrderItemSchema], required: true },
    starterBox: { type: starterBoxSchema, required: true },
    totalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled", "refunded"],
      default: "pending",
    },
    paymentMethod: { type: String },
    deliveredDate: { type: Date },
    currency: { type: String, default: "USD" },
    stripeSessionId: { type: String, required: true },
    stripeSubscriptionId: { type: String },
    nextOrderDate: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", OrderSchema);
