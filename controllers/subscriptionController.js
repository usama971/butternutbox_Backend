const Subscription = require('../Models/subscription');
const subscriptionValidation = require('../validation/subscriptionValidation');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createSubscription = async (req, res) => {
  try {
    const { error } = subscriptionValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const subscription = new Subscription(req.body);
    await subscription.save();
    res.status(201).json({ message: 'Subscription created', data: subscription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate('userId orderId');
    res.json({ message: 'Subscriptions fetched', data: subscriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const subscriptions = await Subscription.find({ userId })
      .populate("orderId")
      .sort({ createdAt: -1 });

    const data = await Promise.all(
      subscriptions.map(async (sub) => {
        const obj = sub.toObject();
        let nextBillingDate = sub.subscriptionEnd;

        const stripeSubId = sub.stripeSubscriptionId?.trim?.();
        if (stripeSubId) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
            if (stripeSub?.current_period_end) {
              nextBillingDate = new Date(stripeSub.current_period_end * 1000);
            }
          } catch (e) {
            /* fallback to subscriptionEnd */
          }
        }

        obj.nextBillingDate = nextBillingDate;
        return obj;
      })
    );

    res.status(200).json({
      message: "Subscriptions fetched successfully",
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found or access denied" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({ message: "Subscription is already cancelled" });
    }

    const stripeSubId = subscription.stripeSubscriptionId?.trim?.();
    if (stripeSubId) {
      try {
        await stripe.subscriptions.update(stripeSubId, {
          cancel_at_period_end: true,
        });
      } catch (stripeErr) {
        console.error("Stripe cancel error:", stripeErr);
        return res.status(500).json({
          message: "Failed to cancel subscription with Stripe",
          error: stripeErr.message,
        });
      }
    }

    subscription.status = "cancelled";
    subscription.autoRenew = false;
    await subscription.save();

    res.status(200).json({
      message: "Subscription cancelled successfully. Access continues until the current period ends.",
      data: subscription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.pauseSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found or access denied" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({ message: "Cannot pause a cancelled subscription" });
    }

    if (subscription.status === "paused") {
      return res.status(400).json({ message: "Subscription is already paused" });
    }

    const stripeSubId = subscription.stripeSubscriptionId?.trim?.();
    if (stripeSubId) {
      try {
        await stripe.subscriptions.update(stripeSubId, {
          pause_collection: { behavior: "void" },
        });
      } catch (stripeErr) {
        console.error("Stripe pause error:", stripeErr);
        if (stripeErr.code === "resource_subscription_pause_not_allowed") {
          return res.status(400).json({
            message: "This subscription cannot be paused (Stripe limitation). Consider cancelling instead.",
          });
        }
        return res.status(500).json({
          message: "Failed to pause subscription with Stripe",
          error: stripeErr.message,
        });
      }
    }

    subscription.status = "paused";
    subscription.autoRenew = false;
    await subscription.save();

    res.status(200).json({
      message: "Subscription paused successfully",
      data: subscription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resumeSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found or access denied" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({ message: "Cannot resume a cancelled subscription" });
    }

    if (subscription.status !== "paused") {
      return res.status(400).json({ message: "Subscription is not paused" });
    }

    const stripeSubId = subscription.stripeSubscriptionId?.trim?.();
    if (stripeSubId) {
      try {
        await stripe.subscriptions.update(stripeSubId, {
          pause_collection: "",
        });
      } catch (stripeErr) {
        console.error("Stripe resume error:", stripeErr);
        return res.status(500).json({
          message: "Failed to resume subscription with Stripe",
          error: stripeErr.message,
        });
      }
    }

    subscription.status = "active";
    subscription.autoRenew = true;
    await subscription.save();

    res.status(200).json({
      message: "Subscription resumed successfully",
      data: subscription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.skipNextDelivery = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId,
    });
    console.log("Subscription:", subscription);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found or access denied" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({ message: "Cannot skip delivery for a cancelled subscription" });
    }

    if (subscription.status === "paused") {
      return res.status(400).json({ message: "Subscription is paused. Resume it first to skip a delivery." });
    }

    if (subscription.skipNextDelivery) {
      return res.status(400).json({ message: "Next delivery is already skipped" });
    }

    const stripeSubId = subscription.stripeSubscriptionId?.trim?.();
    if (!stripeSubId) {
      return res.status(400).json({ message: "Subscription has no Stripe link. Cannot skip delivery." });
    }

    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    let periodEnd = stripeSub?.current_period_end;
    if (periodEnd == null || Number.isNaN(Number(periodEnd))) {
      periodEnd = Math.floor((subscription.subscriptionEnd?.getTime?.() ?? Date.now()) / 1000);
    } else {
      periodEnd = Math.floor(Number(periodEnd));
    }
    const frequencyDays = Number(subscription.frequencyDays) || 14;
    const periodSeconds = frequencyDays * 24 * 60 * 60;
    const resumeTimestamp = Math.floor(periodEnd + periodSeconds);

    try {
      await stripe.subscriptions.update(stripeSubId, {
        pause_collection: {
          behavior: "void",
          resumes_at: resumeTimestamp,
        },
      });
    } catch (stripeErr) {
      console.error("Stripe skip delivery error:", stripeErr);
      if (stripeErr.code === "resource_subscription_pause_not_allowed") {
        return res.status(400).json({
          message: "This subscription cannot skip delivery (Stripe limitation).",
        });
      }
      return res.status(500).json({
        message: "Failed to skip next delivery with Stripe",
        error: stripeErr.message,
      });
    }

    const skippedUntilDate = new Date(resumeTimestamp * 1000);
    subscription.skipNextDelivery = true;
    subscription.skippedUntilDate = skippedUntilDate;
    await subscription.save();

    res.status(200).json({
      message: "Next delivery skipped successfully. Subscription will resume on the next billing date.",
      data: { ...subscription.toObject(), skippedUntilDate },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
