// const User = require("../Models/userModel");
// const Pet = require("../Models/pet1");
// const Order = require("../Models/order");
// const Subscription = require("../Models/subscription");
// const CheckoutSession = require("../Models/CheckoutSession");
// const Recipe = require("../Models/recipe");

// async function processCheckoutSession(sessionId, stripeCustomerId, stripeSubscriptionId) {
//   try {
//     // 1️⃣ Get the payload saved earlier in CheckoutSession
//     const checkout = await CheckoutSession.findOne({ sessionId });
//     if (!checkout) throw new Error("Checkout session not found");

// 	console.log("✅ Retrieved checkout session:", checkout);

//     const { pupParent, dogs } = checkout.payload;

// 	console.log("✅ Retrieved payload:", { pupParent, dogs });
//     if (!pupParent || !dogs || !dogs.length) {
//       throw new Error("Invalid checkout payload");
//     }

//     // 2️⃣ Find existing user or create new
//     let user = await User.findOne({ email: pupParent.email });
//     if (!user) {
//       user = await User.create({
//         name: pupParent.name,
//         email: pupParent.email,
//         password: pupParent.password, // Hash if needed
//         confirmPassword: pupParent.password,
//         phone: pupParent.phone,
//         address: pupParent.address,
//         agreeTerms: pupParent.agreeTerms,
//         receiveDiscounts: pupParent.receiveDiscounts,
//       });
//     }

//     // 3️⃣ Loop through dogs to create pets, orders, subscriptions
//     // for (const dog of dogs) {
//     //   // 3a️⃣ Create pet
//     //   const pet = await Pet.create({
//     //     userId: user._id,
//     //     name: dog.name,
//     //     gender: dog.gender,
//     //     behavior: dog.behavior,
//     //     food: dog.food || [],
//     //     behaviorFussy: dog.behaviorFussy,
//     //     importantFood: dog.importantFoodItem || dog.importantFood,
//     //     bodyType: dog.bodyType,
//     //     weight: dog.weight,
//     //     activity: dog.activityLevel,
//     //     workingDog: dog.workingDog,
//     //     allergies: dog.allergies || [],
//     //     healthIssues: dog.healthIssues || [],
//     //     snacks: dog.snacks || [],
//     //     selectedHealthIssues: dog.selectedHealthIssues || [],
//     //     breed: dog.breed,
//     //     ageGroup: dog.ageGroup,
//     //     age: dog.age,
//     //     health: dog.health,
//     //     healthCondition: dog.healthIssues?.join(",") || "",
//     //   });

//     //   // 3b️⃣ Create order items from dog.order.recipes
//     //   let dogTotal = 0;
//     //   const orderItems = [];

//     //   if (dog.order?.recipes && dog.order.recipes.length) {
//     //     for (const recipeObj of dog.order.recipes) {
//     //       const recipe = await Recipe.findById(recipeObj.recipeId);
//     //       if (!recipe) continue;

//     //       dogTotal += Number(recipe.price);

//     //       orderItems.push({
//     //         recipeId: recipe._id,
//     //         name: recipe.name,
//     //         price: recipe.price,
//     //         description: recipe.description,
//     //         category: recipe.category,
//     //         qty: 1,
//     //         ingredients: recipe.ingredients || [],
//     //       });
//     //     }
//     //   }

//     //   // 3c️⃣ Add starter box if provided
//     //   const starterBoxPrice = dog.order?.starterBox?.price ? Number(dog.order.starterBox.price) : 0;
//     //   dogTotal += starterBoxPrice;

//     //   const starterBox = {
//     //     starterQuantity: dog.order?.starterBox?.starterQuantity || 1,
//     //     price: starterBoxPrice,
//     //   };

//     //   // 3d️⃣ Create order for this dog
//     //   const order = await Order.create({
//     //     userId: user._id,
//     //     petId: pet._id,
//     //     orderItems,
//     //     starterBox,
//     //     totalAmount: dogTotal,
//     //     orderStatus: "paid",
//     //     paymentMethod: "stripe",
//     //     stripeSessionId: sessionId,
//     //     currency: "USD",
//     //   });

//     //   // 3e️⃣ Create subscription tied to this pet/order
//     //   const start = new Date();
//     //   const end = new Date();
//     //   end.setDate(start.getDate() + 14); // 14 days subscription

//     //   await Subscription.create({
//     //     userId: user._id,
//     //     petId: pet._id,
//     //     orderId: order._id,
//     //     subscriptionStart: start,
//     //     subscriptionEnd: end,
//     //     frequency: "14 days",
//     //     frequencyDays: 14,
//     //     autoRenew: true,
//     //     stripeCustomerId,
//     //     stripeSubscriptionId,
//     //     status: "active",
//     //     nextOrderDate: end,
//     //   });
//     // }
// 	for (const dog of dogs) {
//   try {
//     const pet = await Pet.create({
//       userId: user._id,
//       name: dog.name,
//       gender: dog.gender,
//       behavior: dog.behavior,
//       food: dog.food || [],
//       behaviorFussy: dog.behaviorFussy,
//       importantFood: dog.importantFoodItem || dog.importantFood,
//       bodyType: dog.bodyType,
//       weight: dog.weight,
//       activity: dog.activityLevel,
//       workingDog: dog.workingDog,
//       allergies: dog.allergies || [],
//       healthIssues: dog.healthIssues || [],
//       snacks: dog.snacks || [],
//       selectedHealthIssues: dog.selectedHealthIssues || [],
//       breed: dog.breed,
//       ageGroup: dog.ageGroup,
//       age: dog.age,
//       health: dog.health,
//       healthCondition: dog.healthIssues?.join(",") || "",
//     });

//     // create order and subscription for this pet
//   } catch (err) {
//     console.error(`Failed to create pet ${dog.name}:`, err.message);
//     continue; // move to next dog
//   }
// }


//     console.log("✅ User, pets, orders, and subscriptions created successfully");
//   } catch (err) {
//     console.error("❌ processCheckoutSession error:", err.message);
//   }
// }

// module.exports = { processCheckoutSession };



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

