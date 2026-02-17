const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
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

router.get("/", userController.getUsers);
router.get("/info", userController.getUsersWithTotalPetsAndOrders);
router.get("/:id", userController.getUserAllDetails);

module.exports = router;
