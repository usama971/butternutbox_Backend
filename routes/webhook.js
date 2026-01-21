const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { processCheckoutSession } = require("../controllers/stripeHelper");

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("✅ Event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed":
        console.log("💰 Payment successful");

        // Call the helper function
        const session = event.data.object;
        console.log("Session ID:", session);
        processCheckoutSession(
          session.id,
          session.customer,
          session.subscription || ""
        );
        break;

      default:
        console.log("Unhandled event:", event.type);
    }

    res.json({ received: true });
  }
);

module.exports = router;
