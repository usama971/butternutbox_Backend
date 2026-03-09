const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authorizePermissions  = require('../controllers/middlewares/authorizePermissions');
const {
  upload,
  uploadToCloudinary,
} = require("../controllers/middlewares/recipeUpload"); // your multer-cloudinary config

router.post("/", userController.createUser);
router.patch("/", userController.UpdateUser);

router.patch(
  "/update-image",
  upload.single("image"),
  userController.updateUserImage,
);

router.get("/",authorizePermissions(['MANAGE_USERS']), userController.getUsers);
router.get("/info", userController.getUsersWithTotalPetsAndOrders);
router.get("/monthly-by-week", userController.getUsersMonthlyByWeek);
router.get("/:id", userController.getUserAllDetails);
router.patch("/block/:userId", userController.blockUnblockUser);

// PATCH /api/admin/user/block/:userId

module.exports = router;
