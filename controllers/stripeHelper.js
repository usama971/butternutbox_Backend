const User = require("../Models/userModel");
const Pet = require("../Models/pet1");
const Order = require("../Models/order");
const Subscription = require("../Models/subscription");
const CheckoutSession = require("../Models/CheckoutSession");
const PromoCode = require("../Models/promoCode");
const Recipe = require("../Models/recipe");
const Lead = require("../Models/lead");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { createAdminNotifications } = require("../services/notificationService");
const {
  buildUpcomingOrderSeed,
  getNextBillingDate,
} = require("../utils/subscriptionUtils");

async function decrementRecipeStock(subOrders) {
  const qtyByRecipe = new Map();
  for (const so of subOrders || []) {
    const items = [...(so.recipes || []), ...(so.extras || [])];
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
  const checkout = await CheckoutSession.findOne({ sessionId });
  if (!checkout) throw new Error("Checkout session not found");

  if (checkout.isProcessed) {
    console.log("✅ Checkout session already processed, skipping:", sessionId);
    return;
  }

  const { pupParent, orders, pricing } = checkout.payload;
  if (!pupParent || !orders?.length || !pricing) {
    throw new Error("Invalid checkout payload");
  }

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

    const lead = await Lead.findOne({ email: pupParent.email });
    if (lead) {
      lead.isConverted = true;
      await lead.save();
    }
  }

  const petIds = [];

  for (let i = 0; i < orders.length && i < 2; i++) {
    const dogDetail = orders[i].dogDetail;
    if (!dogDetail) continue;

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
    });

    petIds.push(pet._id);
  }

  const subOrders = [];

  for (let i = 0; i < orders.length && i < 2; i++) {
    const currentOrder = orders[i];
    subOrders.push({
      recipes: currentOrder.recipes || [],
      starter: currentOrder.starter,
      extras: currentOrder.extras || [],
      subOrderTotal: currentOrder.subOrderTotal,
      petId: petIds[i],
    });
  }

  if (pricing?.discount?.code) {
    const promo = await PromoCode.findOne({
      code: pricing.discount.code,
      status: "active",
    });
    if (promo) {
      promo.used++;
      await promo.save();
    }
  }

  const deliveryAddress = pupParent.address || "";

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
    orderType: "initial",
    deliveryAddress,
    currency: "USD",
  });

  await decrementRecipeStock(order.orders);
  await createAdminNotifications({
    title: "New order created",
    message: `A new order ${order.orderID || order._id} has been created.`,
    type: "new_order",
    orderId: order._id,
    metadata: { userId: user._id, userEmail: user.email },
  });

  if (stripeSubscriptionId) {
    const startDate = new Date();
    const frequencyDays = 14;
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + frequencyDays);

    const subscription = await Subscription.create({
      userId: user._id,
      orderId: order._id,
      subscriptionStart: startDate,
      subscriptionEnd: endDate,
      frequency: `${frequencyDays} days`,
      frequencyDays,
      autoRenew: true,
      stripeCustomerId,
      stripeSubscriptionId,
      status: "active",
      nextOrderDate: endDate,
      deliveryAddress,
      upcomingOrder: buildUpcomingOrderSeed(subOrders, pricing.subtotal),
    });

    await Order.findByIdAndUpdate(order._id, { subscriptionId: subscription._id });
    console.log("✅ Subscription created:", subscription._id);
  }

  checkout.isProcessed = true;
  await checkout.save();

  console.log("✅ User, pets, orders & subscriptions created successfully");
}

async function processInvoicePaymentSucceeded(invoice) {
  if (invoice.billing_reason !== "subscription_cycle") {
    console.log("⏭️ Skipping invoice — billing_reason:", invoice.billing_reason);
    return;
  }

  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) {
    console.log("⏭️ Skipping invoice — no subscription on invoice");
    return;
  }

  const existingOrder = await Order.findOne({ stripeInvoiceId: invoice.id });
  if (existingOrder) {
    console.log("✅ Renewal order already exists for invoice:", invoice.id);
    return;
  }

  const subscription = await Subscription.findOne({ stripeSubscriptionId });
  if (!subscription) {
    throw new Error(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
  }

  if (subscription.lastRenewalInvoiceId === invoice.id) {
    console.log("✅ Invoice already processed on subscription:", invoice.id);
    return;
  }

  if (subscription.status === "cancelled") {
    console.log("⏭️ Skipping renewal — subscription cancelled");
    return;
  }

  let upcoming = subscription.upcomingOrder;
  if (!upcoming?.orders?.length) {
    const templateOrder = await Order.findById(subscription.orderId);
    if (!templateOrder) throw new Error("No upcoming order template found");
    upcoming = buildUpcomingOrderSeed(
      templateOrder.orders,
      templateOrder.pricing?.subtotal || templateOrder.pricing?.totalPayable
    );
  }

  const renewalPricing = {
    subtotal: upcoming.pricing.subtotal,
    discount: {},
    totalPayable: upcoming.pricing.totalPayable,
  };

  const newOrder = await Order.create({
    userId: subscription.userId,
    orders: JSON.parse(JSON.stringify(upcoming.orders)),
    pricing: renewalPricing,
    orderStatus: "paid",
    orderStatusHistory: [{ status: "paid", updatedAt: new Date() }],
    paymentMethod: "stripe",
    stripeSubscriptionId,
    stripeInvoiceId: invoice.id,
    subscriptionId: subscription._id,
    orderType: "renewal",
    deliveryAddress: subscription.deliveryAddress || "",
    currency: "USD",
  });

  await decrementRecipeStock(newOrder.orders);
  await createAdminNotifications({
    title: "Renewal order created",
    message: `Renewal order ${newOrder.orderID || newOrder._id} has been created.`,
    type: "new_order",
    orderId: newOrder._id,
    metadata: { userId: subscription.userId, subscriptionId: subscription._id },
  });

  const frequencyDays = Number(subscription.frequencyDays) || 14;
  const nextBillingDate = await getNextBillingDate(subscription);
  const newEndDate = new Date(nextBillingDate);
  newEndDate.setDate(newEndDate.getDate() + frequencyDays);

  subscription.upcomingOrder = buildUpcomingOrderSeed(
    upcoming.orders,
    upcoming.pricing.totalPayable
  );
  subscription.lastRenewalInvoiceId = invoice.id;
  subscription.subscriptionEnd = nextBillingDate;
  subscription.nextOrderDate = newEndDate;
  subscription.skipNextDelivery = false;
  subscription.skippedUntilDate = null;
  if (subscription.status === "past_due") {
    subscription.status = "active";
  }
  await subscription.save();

  console.log("✅ Renewal order created:", newOrder._id);
}

async function processInvoicePaymentFailed(invoice) {
  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) return;

  const subscription = await Subscription.findOne({ stripeSubscriptionId });
  if (!subscription) return;

  subscription.status = "past_due";
  await subscription.save();
  console.log("⚠️ Subscription marked past_due:", subscription._id);
}

// 👈 YEH NAYA FUNCTION ADD KAREN (Record delete nahi hoga, sirf status 'cancelled' hoga)
async function processSubscriptionCancelled(stripeSubscriptionId) {
  if (!stripeSubscriptionId) return;

  const subscription = await Subscription.findOne({ stripeSubscriptionId });
  if (!subscription) {
    console.log(`⚠️ Subscription not found in DB for Stripe ID: ${stripeSubscriptionId}`);
    return;
  }

  // Record delete nahi kar rahe, sirf status ko 'cancelled' kar rahe hain history rakhne ke liye
  subscription.status = "cancelled"; 
  await subscription.save();
  
  console.log(`❌ Subscription marked as cancelled in DB (History Preserved): ${subscription._id}`);
}


async function createStripePortalSession(subscriptionId, returnUrl) {
  console.log("Creating Stripe Portal Session for subscription:", subscriptionId);
  // 1. DB se subscription find karen
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found in database");

  // 2. Stripe Customer Portal Session create karen
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl, // Payment ya card update ke baad user yahan wapas aayega
    flow_data: {
      type: "payment_method_update", // 👈 Yeh option user ko DIRECT sirf card update aur retry wale page par le jayega
    },
  });

  // 3. Frontend ke liye secure URL return karen
  return { url: portalSession.url };
}

module.exports = {
  processCheckoutSession,
  processInvoicePaymentSucceeded,
  processInvoicePaymentFailed,
  decrementRecipeStock,
  processSubscriptionCancelled, // Naya function export kiya
  createStripePortalSession
};
