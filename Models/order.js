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
      enum: ["processing", "paid", "dispatched", "delivered", "cancelled", "disputed"],
      default: "processing",
    },
    trackingId: {
      type: String,
      default: "",
    },
    trackingPartner: {
      type: String,
      default: "",
    },
    orderStatusHistory: [
      new mongoose.Schema(
        {
          status: {
            type: String,
            // enum: ["processing", "paid", "dispatched", "delivered", "cancelled", "disputed"],
            default: "paid",
            required: true,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
          updatedBy:{
            type: String,
            default: "",
          },
        },
        { _id: false }
      ),


    ],
    cancelReason: {
      type: String,
      enum: [
        "too_expensive",
        "found_alternative",
        "pet_no_longer_needs",
        "delivery_issues",
        "other",

        // Admin / Delivery partner reasons
        "customer_not_available",
        "customer_refused_delivery",
        "address_not_found",
        "invalid_contact_details",
        "delivery_failed_multiple_attempts",
        "order_returned_by_delivery_partner"
      ],
    },
    cancelNote: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },

    return: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected"],
        default: "none",
      },

      reason: {
        type: String,
        enum: [
          "damaged_item",
          "wrong_item",
          "quality_issue",
          "not_as_described",
          "too_expensive",
          "found_alternative",
          "pet_no_longer_needs",
          "delivery_issues",
          "changed_mind",
          "other",
        ],
      },

      // note: {
      //   type: String,
      // },
      userNote: {
        type: String,
      },
      rejectionReason: {
        type: String,
        enum: [
          "return_window_expired",
          "item_used_or_damaged",
          "missing_original_packaging",
          "non_returnable_item",
          "insufficient_evidence",
          "policy_violation",
          "incorrect_return_reason",
          "already_refunded",
          "return_not_required",
          "other",
        ],
      },
      // rejectionNote: String,
      adminNote: String,
      requestedAt: Date,
      processedAt: Date,
    },

    refund: {
      status: {
        type: String,
        enum: ["none", "requested", "processing", "completed", "rejected"],
        default: "none",
      },
      amount: { type: Number },
      reason: { type: String },
      requestedAt: { type: Date },
      processedAt: { type: Date },
      transactionId: { type: String },
    },

    dispute: {
      status: {
        type: String,
        enum: ["none", "requested", "under_review", "approved", "rejected"],
        default: "none",
      },
      reason: {
        type: String,
        enum: [
          "wrong_item",
          "damaged_item",
          "quality_issue",
          "missing_item",
          "delivery_issue",
          "other",
        ],
      },
      note: {
        type: String, // Additional details from the user
      },
      evidence: [
        {
          type: String, // URLs or file paths of uploaded images/videos
        },
      ],
      adminResolution: {
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        note: {
          type: String, // Admin note explaining the resolution
        },
        resolvedAt: {
          type: Date,
        },
      },
      requestedAt: {
        type: Date,
      },
      processedAt: {
        type: Date,
      },
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
