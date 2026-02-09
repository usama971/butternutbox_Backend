



// test 2

const User = require("../Models/userModel");
const Pet = require("../Models/pet1");
const Order = require("../Models/order");
const Subscription = require("../Models/subscription");
const CheckoutSession = require("../Models/CheckoutSession");
const Recipe = require("../Models/recipe");

async function processCheckoutSession(sessionId, stripeCustomerId, stripeSubscriptionId) {
  // 1️⃣ Fetch saved checkout payload
  const checkout = await CheckoutSession.findOne({ sessionId });
  if (!checkout) throw new Error("Checkout session not found");

  const { pupParent, dogs } = checkout.payload;
  if (!pupParent || !dogs?.length) {
    throw new Error("Invalid checkout payload");
  }

  // 2️⃣ Create or find user
  let user = await User.findOne({ email: pupParent.email });

  if (!user) {
    user = await User.create({
      name: pupParent.name,
      email: pupParent.email,
      password: pupParent.password,
      confirmPassword: pupParent.password,
      phone: pupParent.phone,
      address: pupParent.address,
      agreeTerms: pupParent.agreeTerms,
      receiveDiscounts: pupParent.receiveDiscounts,
    });
  }

  // 3️⃣ Loop dogs (MAX 2)
  for (const dog of dogs.slice(0, 2)) {
    /* ---------- PET ---------- */
    const pet = await Pet.create({
      userId: user._id,
      name: dog.name,
      gender: dog.gender,
      behavior: dog.behavior,
      food: dog.food || [],
      behaviorFussy: dog.behaviorFussy,
      importantFood: dog.importantFoodItem || dog.importantFood,
      bodyType: dog.bodyType,
      weight: dog.weight,
      activity: dog.activityLevel,
      workingDog: dog.workingDog,
      allergies: dog.allergies || [],
      healthIssues: dog.healthIssues || [],
      snacks: dog.snacks || [],
      selectedHealthIssues: dog.selectedHealthIssues || [],
      breed: dog.breed,
      ageGroup: dog.ageGroup,
      age: dog.age,
      health: dog.health,
      healthCondition: dog.healthIssues?.join(",") || "",
    });

    /* ---------- ORDER ---------- */
    let totalAmount = 0;
    const orderItems = [];

    for (const item of dog.order?.recipes || []) {
      const recipe = await Recipe.findById(item.recipeId);
      if (!recipe) continue;

      totalAmount += Number(recipe.price);

      orderItems.push({
        recipeId: recipe._id,
        name: recipe.name,
        price: recipe.price,
        description: recipe.description,
        category: recipe.category,
        qty: 1,
        ingredients: recipe.ingredients || [],
      });
    }

    const starterPrice = Number(dog.order?.starterBox?.price || 0);
    totalAmount += starterPrice;

    const order = await Order.create({
      userId: user._id,
      petId: pet._id,
      orderItems,
      starterBox: {
        starterQuantity: dog.order?.starterBox?.starterQuantity || 1,
        price: starterPrice,
      },
      totalAmount,
      orderStatus: "paid",
      paymentMethod: "stripe",
      stripeSessionId: sessionId,
      currency: "USD",
    });

    /* ---------- SUBSCRIPTION ---------- */
    const hasStripeSubscription = !!stripeSubscriptionId;

  if (hasStripeSubscription) {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 14);

  await Subscription.create({
    userId: user._id,
    petId: pet._id,
    orderId: order._id,
    subscriptionStart: start,
    subscriptionEnd: end,
    frequency: "14 days",
    frequencyDays: 14,
    autoRenew: true,
    stripeCustomerId,
    stripeSubscriptionId,
    status: "active",
    nextOrderDate: end,
  });
}

  }

  console.log("✅ User, pets, orders & subscriptions created successfully");
}

module.exports = { processCheckoutSession };

