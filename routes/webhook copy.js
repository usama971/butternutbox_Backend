const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

    // Handle events
    switch (event.type) {
      case "checkout.session.completed":
        console.log("💰 Payment successful hihihi");
        break;

      case "invoice.payment_succeeded":
        console.log("📄 Invoice paid");

        break;

      case "customer.subscription.created":
        console.log("🔁 Subscription created");
        break;

      default:
        console.log("Unhandled event:", event.type);
    }

    res.json({ received: true });
  }
);

module.exports = router;
