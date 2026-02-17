const mongoose = require("mongoose");

// Sub-schema for individual recipes
const OrderItemSchema = new mongoose.Schema(
  {
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    qty: { type: Number, default: 1 },
    ingredients: { type: [String], required: true },
  },
  { _id: false },
);

// Sub-schema for starter box
const StarterBoxSchema = new mongoose.Schema(
  {
    starterQuantity: { type: String, required: true },
    price: { type: Number, required: true },
    selectedPlan: { type: String }, // Add selectedPlan
  },
  { _id: false },
);

// Sub-schema for individual sub-orders
const SubOrderSchema = new mongoose.Schema(
  {
    recipes: { type: [OrderItemSchema], required: true },
    starter: { type: StarterBoxSchema, required: true },
    extras: { type: [OrderItemSchema], default: [] },
    subOrderTotal: { type: Number, required: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
  },
  { _id: false },
);

// Main Order schema
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
    orders: { type: [SubOrderSchema], required: true }, // Array of sub-orders
    pricing: {
      subtotal: { type: Number, required: true },
      discount: {
        code: { type: String },
        discountType: { type: String },
        value: { type: Number },
        amount: { type: Number },
      },
      totalPayable: { type: Number, required: true },
    },
    // totalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ["processing", "paid", "cancelled", "refunded","dispatched"],
      default: "processing",
    },
    cancelReason: {
      type: String,
      enum: [
        "too_expensive",
        "found_alternative",
        "pet_no_longer_needs",
        "delivery_issues",
        "other",
      ],
    },
    cancelNote: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },

    paymentMethod: { type: String, default: "" },
    deliveredDate: { type: Date },
    currency: { type: String, default: "USD" },
    stripeSessionId: { type: String, required: true },
    stripeSubscriptionId: { type: String },
    nextOrderDate: { type: Date },
  },
  { timestamps: true },
);

// ----- Pre-save Hook for orderID -----
// OrderSchema.pre("save", async function (next) {
//   if (this.orderID) return next(); // already set

//   const generateOrderID = () => {
//     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//     let id = "";
//     for (let i = 0; i < 8; i++) {
//       id += chars[Math.floor(Math.random() * chars.length)];
//     }
//     return id;
//   };

//   let newID;
//   let exists = true;

//   while (exists) {
//     newID = generateOrderID();
//     const order = await mongoose.models.Order.findOne({ orderID: newID });
//     if (!order) exists = false;
//   }

//   this.orderID = newID;
//   next();
// });

// ----- Pre-save Hook for orderID -----
OrderSchema.pre("save", async function () {
  if (this.orderID) return; // already set

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

  while (exists) {
    newID = generateOrderID();
    const order = await mongoose.models.Order.findOne({ orderID: newID });
    if (!order) exists = false;
  }

  this.orderID = newID;
});

module.exports = mongoose.model("Order", OrderSchema);
