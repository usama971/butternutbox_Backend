const Joi = require("joi");

const orderItemValidation = Joi.object({
  recipeId: Joi.string().required(),
  name: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string().allow("").optional(),
  category: Joi.string().allow("").optional(),
  ingredients: Joi.array().items(Joi.string()).required(),
  qty: Joi.number().optional().default(1),
});

const starterSchema = Joi.object({
  starterQuantity: Joi.string().required(),
  price: Joi.number().required(),
  selectedPlan: Joi.string().required(),
});

const extraItemSchema = Joi.object({
  recipeId: Joi.string().required(),
  name: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string().allow("").optional(),
  category: Joi.string().allow("").optional(),
  ingredients: Joi.array().items(Joi.string()).required(),
  qty: Joi.number().optional().default(1),
});

const upcomingSubOrderValidation = Joi.object({
  petId: Joi.string().required(),
  recipes: Joi.array().items(orderItemValidation).min(1).required(),
  starter: starterSchema.required(),
  extras: Joi.array().items(extraItemSchema).default([]),
  subOrderTotal: Joi.number().required(),
});

const upcomingOrderValidation = Joi.object({
  orders: Joi.array().items(upcomingSubOrderValidation).min(1).max(2).required(),
});

const deliveryAddressValidation = Joi.object({
  deliveryAddress: Joi.string().trim().min(1).required(),
});

module.exports = {
  upcomingOrderValidation,
  deliveryAddressValidation,
};
