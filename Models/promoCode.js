const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: { type: String, required: true, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    discount: { type: Number, required: true },
    minOrder: { type: Number, required: true },
    numberOfPromoCodes: { type: Number, required: true, min: 1 },
    limitPerUser: { type: Number, required: true, min: 1, default: 1 },
    promoType: {
      type: String,
      enum: ["percentage", "fixed","shipping"],
      required: true,
    },
    used: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "expire"],
      default: "active",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("PromoCode", promoCodeSchema);
