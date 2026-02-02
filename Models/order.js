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
    orderID: {
      type: String,
      unique: true,
      index: true,
    },
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


// ----- Pre-save Hook for orderID -----
OrderSchema.pre("save", async function (next) {
  if (this.orderID) return next(); // already set, skip

  const generateOrderID = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  };

  let newID;
  let exists = true;

  // Loop until we generate a unique ID
  while (exists) {
    newID = generateOrderID();
    // Check if another order already has this ID
    const order = await mongoose.models.Order.findOne({ orderID: newID });
    if (!order) exists = false;
  }

  this.orderID = newID;
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
