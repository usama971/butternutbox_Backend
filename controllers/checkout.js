
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const mongoose = require("mongoose");

const Pet = require("../validation/petValidation");
const { orderValidation, pricingSchema } = require("../validation/orderValidation");
const User = require("../validation/userValidation");

const userModel = require("../Models/userModel");
const CheckoutSession = require("../Models/CheckoutSession");

exports.createCheckout = async (req, res) => {
  try {
    console.log("Create Checkout req.body:", req.body);
    const { pupParent, orders, pricing } = req.body;

    if (!pupParent || !orders?.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // Check if user already exists
    const userExists = await userModel.findOne({ email: pupParent.email });
    if (userExists) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // -----------------------------
    // Validate pupParent
    // -----------------------------
    const { error: userError } = User.validate(pupParent);
    if (userError) {
      return res.status(400).json({ errors: [userError.details[0].message] });
    }

    // -----------------------------
    // Validate orders and dogDetails
    // -----------------------------
    const orderErrors = [];

    orders.forEach((orderItem, index) => {
      // Validate dogDetail first
      const { error: dogError } = Pet.validate(orderItem.dogDetail);
      if (dogError) {
        orderErrors.push({
          orderIndex: index,
          type: "dogDetail",
          messages: dogError.details.map((e) => e.message),
        });
        console.log(`Dog Detail validation failed for order index ${index}:`, dogError.details);
      }

      // Validate order itself
      const { dogDetail, ...pureOrder } = orderItem;
      console.log(`Validating order at index ${index}:`, pureOrder);
      const { error: orderError } = orderValidation.validate(pureOrder);
      if (orderError) {
        orderErrors.push({
          orderIndex: index,
          type: "order",
          messages: orderError.details.map((e) => e.message),
        });
      }
    });

    if (orderErrors.length > 0) {
      return res.status(400).json({ errors: orderErrors });
    }

    // -----------------------------
    // Validate pricing
    // -----------------------------
    const { error: pricingError } = pricingSchema.validate(pricing);
    if (pricingError) {
      return res.status(400).json({
        errors: pricingError.details.map((e) => e.message),
      });
    }

    // -----------------------------
    // CREATE STRIPE SUBSCRIPTION
    // -----------------------------
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(pricing.totalPayable * 100),
      currency: "usd",
      recurring: {
        interval: "day",
        interval_count: 14,
      },
      product_data: { name: "Dog Food Subscription" },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: pupParent.email,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    // Save session payload
    await CheckoutSession.create({
      sessionId: session.id,
      payload: req.body,
      isProcessed: false,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ message: err.message });
  }
};

