const Joi = require("joi");

const ingredientValidation = (data) => {
  return Joi.object({
    name: Joi.string().trim().required(),
    allergenTag: Joi.string().trim().allow("", null),
    ingredientsBenefits: Joi.string().trim().allow("", null),
    isActive: Joi.boolean().optional(),
  }).validate(data);
};

const updateIngredientValidation = (data) => {
  return Joi.object({
    name: Joi.string().trim(),
    allergenTag: Joi.string().trim().allow("", null),
  }).validate(data);
};

module.exports = {
  ingredientValidation
  
};