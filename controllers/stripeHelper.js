



// test 2

const User = require("../Models/userModel");
const Pet = require("../Models/pet1");
const Order = require("../Models/order");
const Subscription = require("../Models/subscription");
const CheckoutSession = require("../Models/CheckoutSession");
const PromoCode = require("../Models/promoCode");
const Recipe = require("../Models/recipe");
const { createAdminNotifications } = require("../services/notificationService");

async function decrementRecipeStock(subOrders) {
  const qtyByRecipe = new Map();
  for (const so of subOrders || []) {
    const items = [
      ...(so.recipes || []),
      ...(so.extras || []),
    ];
    for (const item of items) {
      const rid = item?.recipeId?.toString?.();
      if (!rid) continue;
      const qty = Math.max(0, Number(item.qty) || 1);
      qtyByRecipe.set(rid, (qtyByRecipe.get(rid) || 0) + qty);
    }
  }
  for (const [recipeId, qty] of qtyByRecipe) {
    await Recipe.updateOne(
      { _id: recipeId, trackStock: true },
      { $inc: { stock: -qty } }
    );
  }
}

async function processCheckoutSession(sessionId, stripeCustomerId, stripeSubscriptionId) {
  // 1️⃣ Fetch saved checkout payload
  const checkout = await CheckoutSession.findOne({ sessionId });
  if (!checkout) throw new Error("Checkout session not found");

  // Idempotency: skip if already processed
  if (checkout.isProcessed) {
    console.log("✅ Checkout session already processed, skipping:", sessionId);
    return;
  }

  const { pupParent, orders, pricing } = checkout.payload;
  console.log("✅ Fetched checkout payload:11111111111", checkout.payload);
  console.log("✅ Fetched checkout payload:111  orders", orders);
  // return; // TEMPORARY STOP
  // const { pupParent, dogs, finalAmount } = checkout.payload;
  if (!pupParent || !orders?.length || !pricing) {
    throw new Error("Invalid checkout payload");
  }

  // 2️⃣ Create or find user
  let user = await User.findOne({ email: pupParent.email });

  console.log("✅ User lookup result:", user);
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

  // 3️⃣ Store dogs in DB and get their IDs
const petIds = []; // To store pet IDs for later use in order

for (let i = 0; i < orders.length && i < 2; i++) {
  const dogDetail = orders[i].dogDetail;

  if (!dogDetail) continue; // Skip if no dogDetail

  const pet = await Pet.create({
    userId: user._id,
    name: dogDetail.name,
    gender: dogDetail.gender,
    behavior: dogDetail.behavior,
    food: dogDetail.food || [],
    behaviorFussy: dogDetail.behaviorFussy,
    importantFood: dogDetail.importantFoodItem || dogDetail.importantFood,
    bodyType: dogDetail.bodyType,
    weight: dogDetail.weight,
    activity: dogDetail.activityLevel,
    workingDog: dogDetail.workingDog,
    allergies: dogDetail.allergies || [],
    health: dogDetail.health,
    selectedHealthIssues: dogDetail.selectedHealthIssues || [],
    snacks: dogDetail.snacks || [],
    breed: dogDetail.breed,
    ageGroup: dogDetail.ageGroup,
    month: dogDetail.month,
    week: dogDetail.week,
    year: dogDetail.year,
    guess: dogDetail.guess,
    notBroughtHomeYet: dogDetail.notBroughtHomeYet,
    behaviorFussy: dogDetail.behaviorFussy,
    importantFood: dogDetail.importantFoodItem || dogDetail.importantFood,
  });

  petIds.push(pet._id);
}

// Now `petIds` array contains 1 or 2 Mongo IDs of the pets
console.log("✅ Pets created, IDs:", petIds);

// 4️⃣ Build sub-orders array (attach petIds correctly)
const subOrders = [];

for (let i = 0; i < orders.length && i < 2; i++) {
  const currentOrder = orders[i];

  subOrders.push({
    recipes: currentOrder.recipes || [],
    starter: currentOrder.starter,
    extras: currentOrder.extras || [],
    subOrderTotal: currentOrder.subOrderTotal,
    petId: petIds[i], // 👈 VERY IMPORTANT
  });
}

console.log("✅ Pricing:", pricing);
if (pricing?.discount?.code) {
  const promo = await PromoCode.findOne({ code: pricing.discount.code, status: "active"});
  console.log("✅ Promo:", promo);
  if (promo) {
    promo.used++;
    await promo.save();
    console.log("✅ Promo saved:", promo);
  }
}

// 5️⃣ Create ONE Order document
const order = await Order.create({
  userId: user._id,
  orders: subOrders,
  pricing: {
    subtotal: pricing.subtotal,
    discount: pricing.discount || {},
    totalPayable: pricing.totalPayable,
  },
  orderStatus: "paid",
  orderStatusHistory: [{ status: "paid", updatedAt: new Date() }],
  paymentMethod: "stripe",
  stripeSessionId: sessionId,
  stripeSubscriptionId: stripeSubscriptionId || null,
  currency: "USD",
});

console.log("✅ Order created successfully:", order._id);
await decrementRecipeStock(order.orders);
await createAdminNotifications({
  title: "New order created",
  message: `A new order ${order.orderID || order._id} has been created.`,
  type: "new_order",
  orderId: order._id,
  metadata: { userId: user._id, userEmail: user.email },
});



// return petIds; // Return pet IDs for order creation in the next step

// 6️⃣ Create Subscription (Per Order)
if (stripeSubscriptionId) {
  const startDate = new Date();

  // Example: 14-day subscription
  const frequencyDays = 14;
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + frequencyDays);

  const subscription = await Subscription.create({
    userId: user._id,
    orderId: order._id,
    subscriptionStart: startDate,
    subscriptionEnd: endDate,
    frequency: `${frequencyDays} days`,
    frequencyDays: frequencyDays,
    autoRenew: true,
    stripeCustomerId,
    stripeSubscriptionId,
    status: "active",
    nextOrderDate: endDate,
  });

  console.log("✅ Subscription created:", subscription._id);
}



 

  // 7️⃣ Mark checkout as processed (idempotency)
  checkout.isProcessed = true;
  await checkout.save();

  console.log("✅ User, pets, orders & subscriptions created successfully");
}

module.exports = { processCheckoutSession };

