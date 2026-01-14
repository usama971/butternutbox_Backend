const Joi = require('joi');

const feedbackValidation = Joi.object({
  orderId: Joi.string().required(),
  userId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().required(),
});
const feedbackUpdateValidation = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().required(),
});

module.exports = {feedbackValidation,feedbackUpdateValidation};
