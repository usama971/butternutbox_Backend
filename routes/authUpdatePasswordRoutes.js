// routes/auth.routes.js
const express = require("express");
const SuperAdmin = require("../Models/SuperAdmin");
const UserModel = require("../Models/userModel");

const router = express.Router();
const { updatePassword } = require("../controllers/authController");

// user routes
router.patch("/update-password", updatePassword(UserModel));

// admin routes
router.patch("/update-password/admin", updatePassword(SuperAdmin));

module.exports = router;
