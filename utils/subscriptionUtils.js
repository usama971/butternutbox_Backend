const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const EDIT_CUTOFF_MS = 48 * 60 * 60 * 1000;

async function getNextBillingDate(subscription) {
  const stripeSubId = subscription.stripeSubscriptionId?.trim?.();
  if (stripeSubId) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
      if (stripeSub?.current_period_end) {
        return new Date(stripeSub.current_period_end * 1000);
      }
    } catch (e) {
      /* fallback to DB dates */
    }
  }
  return subscription.nextOrderDate || subscription.subscriptionEnd;
}

function getEditCutoffAt(nextBillingDate) {
  return new Date(nextBillingDate.getTime() - EDIT_CUTOFF_MS);
}

function canEditUpcoming(subscription, nextBillingDate) {
  if (subscription.status !== "active") return false;
  if (subscription.skipNextDelivery) return false;
  return new Date() < getEditCutoffAt(nextBillingDate);
}

function buildUpcomingOrderSeed(subOrders, subtotal) {
  return {
    orders: JSON.parse(JSON.stringify(subOrders)),
    pricing: {
      subtotal,
      totalPayable: subtotal,
    },
    updatedAt: new Date(),
  };
}

function recalculateUpcomingPricing(orders) {
  const subtotal = (orders || []).reduce(
    (sum, o) => sum + (Number(o.subOrderTotal) || 0),
    0
  );
  return { subtotal, totalPayable: subtotal };
}

async function syncStripeSubscriptionPrice(stripeSubscriptionId, totalPayable) {
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const item = stripeSub?.items?.data?.[0];
  if (!item) throw new Error("Stripe subscription has no items");

  const currentAmount = item.price?.unit_amount;
  const newAmount = Math.round(totalPayable * 100);
  if (currentAmount === newAmount) return;

  const recurring = item.price?.recurring || { interval: "day", interval_count: 14 };
  const productId =
    typeof item.price?.product === "string"
      ? item.price.product
      : item.price?.product?.id;

  const newPrice = await stripe.prices.create({
    unit_amount: newAmount,
    currency: item.price?.currency || "usd",
    recurring: {
      interval: recurring.interval,
      interval_count: recurring.interval_count,
    },
    product: productId,
  });

  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: item.id, price: newPrice.id }],
    proration_behavior: "none",
  });
}

module.exports = {
  EDIT_CUTOFF_MS,
  getNextBillingDate,
  getEditCutoffAt,
  canEditUpcoming,
  buildUpcomingOrderSeed,
  recalculateUpcomingPricing,
  syncStripeSubscriptionPrice,
};
