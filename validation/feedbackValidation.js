const Joi = require('joi');

const feedbackValidation = Joi.object({
  orderId: Joi.string().required(),
  userId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow(''),
});

module.exports = feedbackValidation;
