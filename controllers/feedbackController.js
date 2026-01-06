const Feedback = require('../Models/feedback');
const feedbackValidation = require('../validation/feedbackValidation');

exports.createFeedback = async (req, res) => {
  try {
    const { error } = feedbackValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const feedback = new Feedback(req.body);
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', data: feedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId orderId');
    res.json({ message: 'Feedbacks fetched', data: feedbacks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
