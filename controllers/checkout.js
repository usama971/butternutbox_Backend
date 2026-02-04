const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Recipe = require("../Models/recipe");
const CheckoutSession = require("../Models/CheckoutSession");

exports.createCheckout = async (req, res) => {
  try {
    console.log("Create Checkout req.body:", req.body);
    const { pupParent, dogs } = req.body;

    if (!pupParent || !dogs || !dogs.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    /* ---------------------------------------
       STEP 1: CALCULATE TOTAL (SERVER TRUTH)
    --------------------------------------- */
    let totalAmount = 0;

    // for (const dog of dogs) {
    //   for (const recipeObj of dog.order.recipes) {
    //     const recipe = await Recipe.findById(recipeObj.recipeId);
    //     if (!recipe) {
    //       return res.status(404).json({ message: "Recipe not found" });
    //     }
    //     totalAmount += Number(recipe.price);
    //   }

    //   if (dog.order?.starterBox?.price) {
    //     totalAmount += Number(dog.order.starterBox.price);
    //   }
    // }

    for (const dog of dogs) {
  for (const recipeObj of dog.order.recipes) {

    // ✅ ADD THIS BLOCK
    if (!recipeObj.recipeId || recipeObj.recipeId.trim() === "") {
      return res.status(400).json({
        message: "recipeId is empty",
        recipeObj,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(recipeObj.recipeId)) {
      return res.status(400).json({
        message: "Invalid recipeId",
        recipeObj,
      });
    }
    // ✅ END OF NEW BLOCK

    const recipe = await Recipe.findById(recipeObj.recipeId);

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    totalAmount += Number(recipe.price);
  }

  if (dog.order?.starterBox?.price) {
    totalAmount += Number(dog.order.starterBox.price);
  }
}


    if (totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    /* ---------------------------------------
       STEP 2: CREATE DYNAMIC RECURRING PRICE
    --------------------------------------- */
    const price = await stripe.prices.create({
      unit_amount: Math.round(totalAmount * 100),
      currency: "usd",
      recurring: {
        interval: "day",
        interval_count: 14, // 🔁 every 14 days
      },
      product_data: {
        name: "Dog Food Subscription",
      },
    });

    /* ---------------------------------------
       STEP 3: CREATE SUBSCRIPTION CHECKOUT
       (IMMEDIATE PAYMENT)
    --------------------------------------- */
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer_email: pupParent.email,

      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],

      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    /* ---------------------------------------
       STEP 4: SAVE SESSION PAYLOAD
    --------------------------------------- */
    await CheckoutSession.create({
      sessionId: session.id,
      payload: req.body,
      isProcessed: false,
    });

    return res.json({ url: session.url });

  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ message: err.message });
  }
};
