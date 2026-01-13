const express = require("express");
const router = express.Router();
const { createCheckout } = require("../controllers/checkout.js");

router.post("/", createCheckout);

module.exports = router;
