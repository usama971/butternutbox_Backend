const Joi = require("joi");

const recipeValidation = Joi.object({
  adminId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow(""),
  ingredients: Joi.array().items(Joi.string()).default([]),
  nutritionalInfo: Joi.string().allow(""),
  price: Joi.number().required(),
  category: Joi.string().valid("extras", "mainCourse").required(),
  image: Joi.object({
    url: Joi.string().uri().required(),
    publicId: Joi.string().required(),
  }).optional(),
});

const updateRecipeValidation = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  ingredients: Joi.array().items(Joi.string()),
  nutritionalInfo: Joi.string().allow(''),
  price: Joi.number(),
  category: Joi.string().valid('extras', 'mainCourse'),
  image: Joi.object({
    url: Joi.string().uri(),
    publicId: Joi.string()
  }).optional()
}).options({ presence: "optional" }); // all fields optional for partial update


module.exports = {recipeValidation,updateRecipeValidation};
