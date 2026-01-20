const { skipMiddlewareFunction } = require('mongoose');
const Feedback = require('../Models/feedback');
const Order = require('../Models/order');
const {feedbackValidation, feedbackUpdateValidation} = require('../validation/feedbackValidation');

// exports.createFeedback = async (req, res) => {
//   try {
//     let userId = req.user.userId;
//     req.body.userId = userId;
//     const { error } = feedbackValidation.validate(req.body);
//     if (error) return res.status(400).json({ error: error.details[0].message });

//     const feedback = new Feedback({ ...req.body, userId });
    
//     await feedback.save();
//     res.status(201).json({ message: 'Feedback submitted', data: feedback });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.createFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;

    req.body.userId = userId;

    // 1️⃣ Validate request once
    const { error } = feedbackValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { orderId } = req.body;

    // 2️⃣ Authorization: order belongs to user
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(403).json({
        error: "Order not found.",
      });
    }

    // 3️⃣ Business rule: one feedback per order
    const alreadyExists = await Feedback.findOne({ orderId });
    if (alreadyExists) {
      return res.status(400).json({
        error: "Feedback already submitted.",
      });
    }

    // 4️⃣ Create feedback
    const feedback = await Feedback.create(req.body);

    res.status(201).json({
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.updateFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;
    const feedbackId = req.params.id;
    console.log("Update Feedback req.params:", req.params);
    console.log("Update Feedback req.body:", req.body);

    // 1️⃣ Validate input
    const { error } = feedbackUpdateValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 2️⃣ Check ownership
    const feedback = await Feedback.findOne({ _id: feedbackId, userId });
    if (!feedback) {
      return res.status(403).json({
        error: "Feedback not found.",
      });
    }

    // 3️⃣ Update safely
    feedback.rating = req.body.rating;
    feedback.comment = req.body.comment;
    await feedback.save();

    res.status(200).json({ message: "Feedback updated successfully", data: feedback });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getFeedbacks = async (req, res) => {
  try {
    let userId = req.user.userId;
    // const feedbacks = await Feedback.find({ userId }).populate('userId orderId');
    const feedbacks = await Feedback.find({ userId }).populate('userId' , select='-_id name email').populate('orderId', select='orderNumber totalAmount');
    res.json({ message: 'Feedbacks fetched', data: feedbacks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
