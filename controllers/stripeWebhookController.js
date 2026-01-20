const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PendingCheckout = require("../Models/PendingCheckout");
const User = require("../Models/userModel");
const Pet = require("../Models/pet1");
const Order = require("../Models/order");
const Subscription = require("../Models/subscription");

exports.stripeWebhookController = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const pendingCheckoutId = session.metadata.pendingCheckoutId;
    const pending = await PendingCheckout.findById(pendingCheckoutId);

    if (!pending || pending.status === "completed") {
      return res.json({ received: true });
    }

    const { pupParent, dogs } = pending.payload;

    // 1️⃣ CREATE USER
    const user = await User.create(pupParent);

    // 2️⃣ CREATE PETS + ORDERS
    for (const dog of dogs) {
      const pet = await Pet.create({
        ...dog,
        userId: user._id
      });

      const order = await Order.create({
        userId: user._id,
        petId: pet._id,
        orderItems: dog.order.orderItems,
        starterBox: dog.order.starterBox,
        totalAmount: dog.order.totalAmount,
        orderStatus: "paid",
        paymentMethod: "stripe"
      });

      // 3️⃣ CREATE SUBSCRIPTION (14 DAYS)
      await Subscription.create({
        userId: user._id,
        orderId: order._id,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        frequency: "14_days",
        status: "active",
        autoRenew: true
      });
    }

    // 4️⃣ MARK PENDING AS COMPLETED
    pending.status = "completed";
    await pending.save();
  }

  res.json({ received: true });
};
