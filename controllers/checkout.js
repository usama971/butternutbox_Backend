const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Recipe = require("../Models/recipe");
const CheckoutSession = require("../Models/CheckoutSession");

exports.createCheckout = async (req, res) => {
  try {
    const { pupParent, dogOrders } = req.body;

    if (!pupParent || !dogOrders || !dogOrders.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // /* --------------------------------------------------
    //    STEP 1: CALCULATE TOTAL (BACKEND IS SOURCE OF TRUTH)
    // -------------------------------------------------- */
    let totalAmount = 0;

    for (const dog of dogOrders) {
      const { order } = dog;

      for (const item of order.orderItems) {
        const recipe = await Recipe.findById(item.recipeId);
        if (!recipe) {
          return res.status(404).json({ message: "Recipe not found" });
        }

        totalAmount += Number(recipe.price) * (item.qty || 1);
      }

      if (order.starterBox?.price) {
        totalAmount += Number(order.starterBox.price);
      }
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    /* --------------------------------------------------
       STEP 2: CREATE STRIPE CHECKOUT SESSION
       - Card saved
       - Auto subscription enabled later
    -------------------------------------------------- */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: pupParent.email,
      //   customer_email: "usamasaeed3k@gmail.com",

      payment_intent_data: {
        setup_future_usage: "off_session", // 🔑 saves card automatically
      },

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Butternut Box Dog Food Plan",
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    /* --------------------------------------------------
       STEP 3: SAVE FULL PAYLOAD IN DB (NOT STRIPE)
    -------------------------------------------------- */
    await CheckoutSession.create({
      sessionId: session.id,
      payload: req.body,
    });

    /* --------------------------------------------------
       STEP 4: RETURN CHECKOUT URL
    -------------------------------------------------- */
    return res.json({
      url: session.url,
    });
  } catch (err) {
    console.error("Checkout Error:", err);
    return res.status(500).json({ message: err.message });
  }
};
