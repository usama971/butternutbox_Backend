const Subscription = require('../Models/subscription');
const subscriptionValidation = require('../validation/subscriptionValidation');

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
