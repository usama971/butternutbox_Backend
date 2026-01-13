const Joi = require("joi");

// ---------------- Create ----------------
const createPromoCodeValidation = Joi.object({
  adminId: Joi.string().required(),
  code: Joi.string()
    .required()
    .min(6)
    .pattern(/^[A-Z0-9]+$/) // Only uppercase letters and numbers, no spaces
    .messages({
      "string.empty": "Promo code is required",
      "string.min": "Promo code must be at least 6 characters",
      "string.pattern.base":
        "Promo code must be uppercase and contain no spaces",
    }),
  promoType: Joi.string().valid("percentage", "fixed", "shipping").required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  percentageDiscount: Joi.string().required(),
  numberOfPromoCodes: Joi.number().integer().min(1).required(),
  limitPerUser: Joi.number().integer().min(1).required(),
  status: Joi.string().valid("active", "expire").default("active"),
});

// ---------------- Update ----------------
const updatePromoCodeValidation = Joi.object({
  endDate: Joi.date().optional(),
  numberOfPromoCodes: Joi.number().integer().min(1).optional(),
  limitPerUser: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid("active", "expire").default("active"),
});

module.exports = {
  createPromoCodeValidation,
  updatePromoCodeValidation,
};
