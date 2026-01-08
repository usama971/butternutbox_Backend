// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const { login, loginUser } = require("../controllers/authController");

router.post("/login/admin", login);
router.post("/login", loginUser);

module.exports = router;
