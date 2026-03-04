const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/", notificationController.getMyNotifications);
router.patch("/read-all", notificationController.markAllNotificationsAsRead);
router.patch("/read/:id", notificationController.markNotificationAsRead);

module.exports = router;
