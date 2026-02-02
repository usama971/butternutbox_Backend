const Joi = require("joi");

const orderItemValidation = Joi.object({
  recipeId: Joi.string().required(),
  name: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  ingredients: Joi.array().required(),
  qty: Joi.number().optional().default(1),
});
const starterBoxSchema = Joi.object({
  starterQuantity: Joi.number().required(),
  price: Joi.string().required(),
});

const orderValidation = Joi.object({
  orderID: Joi.string().optional(),
  userId: Joi.string().required(),
  petId: Joi.string().required(),
  orderItems: Joi.array().items(orderItemValidation).min(1).required(),
  starterBox: starterBoxSchema.required(),
  totalAmount: Joi.number().required(),
  orderStatus: Joi.string()
    .valid("pending", "paid", "cancelled", "refunded")
    .default("pending"),
  paymentMethod: Joi.string().allow("").optional,
  deliveredDate: Joi.date().allow(null),
  currency: Joi.string().default("USD"),
});

module.exports = orderValidation;
