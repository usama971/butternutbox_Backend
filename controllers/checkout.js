const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Recipe = require("../Models/recipe");
const CheckoutSession = require("../Models/CheckoutSession");

exports.createCheckout = async (req, res) => {
  try {
    const { pupParent, dogs } = req.body;

    if (!pupParent || !dogs || !dogs.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    /* ---------------------------------------------
       STEP 1: CALCULATE TOTAL (BACKEND IS SOURCE OF TRUTH)
    --------------------------------------------- */
    let totalAmount = 0;

    for (const dog of dogs) {
      if (!dog.order?.recipes || !dog.order.recipes.length) continue;

      // Loop through selected recipes for this dog
      for (const recipeObj of dog.order.recipes) {
        const recipeId = recipeObj.recipeId;

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
          return res.status(404).json({ message: `Recipe not found: ${recipeId}` });
        }

        totalAmount += Number(recipe.price);
      }

      // Add starter box price if present
      if (dog.order?.starterBox?.price && !isNaN(Number(dog.order.starterBox.price))) {
        totalAmount += Number(dog.order.starterBox.price);
      }
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    /* ---------------------------------------------
       STEP 2: CREATE STRIPE CHECKOUT SESSION
       - Card saved
       - Future payments enabled
    --------------------------------------------- */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      customer_email: pupParent.email,

      payment_intent_data: {
        setup_future_usage: "off_session", // saves card for auto-renew
      },

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Butternut Box Dog Food Plan",
              description: `${dogs.length} dog(s) order`,
            },
            unit_amount: Math.round(totalAmount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,

      metadata: {
        totalDogs: dogs.length.toString(),
      },
    });

    /* ---------------------------------------------
       STEP 3: SAVE FULL PAYLOAD IN DB (for webhook)
    --------------------------------------------- */
    await CheckoutSession.create({
      sessionId: session.id,
      payload: req.body,
      totalAmount,
      status: "pending",
    });

    /* ---------------------------------------------
       STEP 4: RETURN STRIPE CHECKOUT URL
    --------------------------------------------- */
    return res.json({
      url: session.url,
    });

  } catch (err) {
    console.error("Checkout Error:", err);
    return res.status(500).json({ message: err.message });
  }
};
