const Shipping = require('../Models/shipping');
const shippingValidation = require('../validation/shippingValidation');

exports.createShipping = async (req, res) => {
  try {
    const { error } = shippingValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const shipping = new Shipping(req.body);
    await shipping.save();
    res.status(201).json({ message: 'Shipping created', data: shipping });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getShippings = async (req, res) => {
  try {
    const shippings = await Shipping.find().populate('orderId');
    res.json({ message: 'Shippings fetched', data: shippings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
