// routes/auth.routes.js
const express = require("express");
const SuperAdmin = require("../Models/SuperAdmin");
const UserModel = require("../Models/userModel");

const router = express.Router();
const { login, loginUser,forgotPassword, verifyOTP,resetPassword } = require("../controllers/authController");

router.post("/login", loginUser);
router.patch("/forgot-password", forgotPassword(UserModel));
router.post("/verify-otp", verifyOTP(UserModel));
router.patch("/reset-password", resetPassword(UserModel));


// admin routes
router.post("/login/admin", login);
router.patch("/forgot-password/admin", forgotPassword(SuperAdmin));
router.post("/verify-otp/admin", verifyOTP(SuperAdmin));
router.patch("/reset-password/admin", resetPassword(SuperAdmin));

module.exports = router;
