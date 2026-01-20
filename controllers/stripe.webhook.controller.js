const stripe = require("../config/stripe");
const Order = require("../Models/order");
const Subscription = require("../Models/subscription");

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // ✅ Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // ✅ Handle only required event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("✅ Checkout completed:", session.id);

      // 1️⃣ Find ALL orders created for this checkout
      const orders = await Order.find({
        stripeSessionId: session.id,
      });

      if (!orders.length) {
        console.warn("⚠️ No orders found for session:", session.id);
        return res.json({ received: true });
      }

      for (const order of orders) {
        // 2️⃣ Mark order PAID
        order.orderStatus = "paid";
        order.paymentMethod = "stripe";
        order.currency = session.currency;
        order.stripePaymentIntentId = session.payment_intent;
        await order.save();

        // 3️⃣ Create 14-day subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 14);

        await Subscription.create({
          userId: order.userId,
          orderId: order._id,
          subscriptionStart: startDate,
          subscriptionEnd: endDate,
          frequency: "14-days",
          status: "active",
          autoRenew: false,
          stripeSessionId: session.id,
        });
      }

      console.log("🎉 Orders + subscriptions created successfully");
    }

    // ✅ Always respond 200 to Stripe
    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).json({ error: error.message });
  }
};
