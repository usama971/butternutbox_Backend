const Notification = require("../Models/notification");

function getRecipientModelFromToken(user = {}) {
  const roleName = String(user.roleName || "").toLowerCase();
  return roleName.includes("admin") ? "SuperAdmin" : "User";
}

exports.getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const recipientModel = getRecipientModelFromToken(req.user);
console.log("userId:",req.user.userId);
    let mynotifications = await Notification.find({recipientId: req.user.userId});
    console.log("My notifications:", mynotifications);
    const filter = {
      recipientId: req.user.userId,
      recipientModel,
    };

    if (req.query.isRead === "true") filter.isRead = true;
    if (req.query.isRead === "false") filter.isRead = false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  console.log("Mark Notification As Read req.body", req.params.id, req.user.userId);
  // return res.status(200).json({ message: "Mark Notification As Read req.body" });
  try {
    const recipientModel = getRecipientModelFromToken(req.user);
    console.log("recipientModel", recipientModel);
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        // recipientId: req.user.userId,
      },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const recipientModel = getRecipientModelFromToken(req.user);
    const result = await Notification.updateMany(
      {
        recipientId: req.user.userId,
        recipientModel,
        isRead: false,
      },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
