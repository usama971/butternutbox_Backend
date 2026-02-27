const Notification = require("../Models/notification");
const SuperAdmin = require("../Models/SuperAdmin");

async function createUserNotification({
  userId,
  title,
  message,
  type = "general",
  orderId,
  metadata = {},
}) {
  if (!userId) return null;

  return Notification.create({
    recipientId: userId,
    recipientModel: "User",
    recipientType: "user",
    title,
    message,
    type,
    orderId,
    metadata,
  });
}

async function createAdminNotifications({
  title,
  message,
  type = "admin_alert",
  orderId,
  metadata = {},
}) {
  const admins = await SuperAdmin.find().select("_id").lean();
  if (!admins.length) return [];

  const docs = admins.map((admin) => ({
    recipientId: admin._id,
    recipientModel: "SuperAdmin",
    recipientType: "admin",
    title,
    message,
    type,
    orderId,
    metadata,
  }));

  return Notification.insertMany(docs);
}

module.exports = {
  createUserNotification,
  createAdminNotifications,
};
