const express = require("express");
const router = express.Router();

const {
  handleStripeWebhook,
} = require("../controllers/stripe.webhook.controller");

router.post("/webhook", handleStripeWebhook);

module.exports = router;
