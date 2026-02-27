const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
    },
    recipientModel: {
      type: String,
      enum: ["User", "SuperAdmin"],
      required: true,
    },
    recipientType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "general" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipientId: 1, recipientModel: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, recipientModel: 1, isRead: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
