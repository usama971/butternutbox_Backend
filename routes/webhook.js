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
      case "checkout.session.completed": {
        console.log("💰 Payment successful");
        const session = event.data.object;
        console.log("Session ID:", session.id, "Customer:", session.customer, "Subscription:", session.subscription);
        try {
          await processCheckoutSession(
            session.id,
            session.customer,
            session.subscription || ""
          );
        } catch (err) {
          console.error("❌ processCheckoutSession error:", err);
          return res.status(500).json({ error: err.message });
        }
        break;
      }

      default:
        console.log("Unhandled event:", event.type);
    }

    res.json({ received: true });
  }
);

module.exports = router;
