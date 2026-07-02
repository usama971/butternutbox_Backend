const express = require("express");
const router = express.Router();
const { createCheckout, createStripePortalSession1} = require("../controllers/checkout.js");

router.post("/", createCheckout);
router.post("/createPortalSession", createStripePortalSession1);

module.exports = router;
