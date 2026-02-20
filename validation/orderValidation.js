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
});

const orderValidation = Joi.object({
  orderID: Joi.string().optional(),
  userId: Joi.string().optional(),
  petId: Joi.string().optional(),

  recipes: Joi.array().items(orderItemValidation).min(1).required(),

  starter: starterSchema.required(), // ✅ FIXED

  extras: Joi.array().items(extraItemSchema).default([]), // ✅ ADDED

  subOrderTotal: Joi.number().required(), // ✅ FIXED

  orderStatus: Joi.string()
    .valid("processing", "paid", "dispatched", "delivered", "cancelled")
    .default("processing"),

  paymentMethod: Joi.string().allow("").optional(), // ✅ FIXED

  deliveredDate: Joi.date().allow(null),

  currency: Joi.string().default("USD"),
});

const pricingSchema = Joi.object({
  subtotal: Joi.number().required(),

  discount: Joi.object({
    code: Joi.string().allow("", null),
    discountType: Joi.string().allow("", null),
    value: Joi.number().allow(null),
    amount: Joi.number().allow(null),
  })
    .optional()
    .allow(null),

  totalPayable: Joi.number().required(),
});

const cancelOrderValidation = Joi.object({
  orderId: Joi.string().required(),
  cancelReason: Joi.string()
    .valid(
      "too_expensive",
      "found_alternative",
      "pet_no_longer_needs",
      "delivery_issues",
      "other",
    )
    .required(),
  cancelNote: Joi.when("cancelReason", {
    is: "other",
    then: Joi.string().required(),
    otherwise: Joi.string().allow("").optional(),
  }),
});

module.exports = { orderValidation, pricingSchema, cancelOrderValidation };
