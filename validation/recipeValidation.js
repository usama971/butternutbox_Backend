const Joi = require("joi");

const recipeValidation = Joi.object({
  adminId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow(""),
  ingredients: Joi.array().items(Joi.string()).default([]),
  nutritionalInfo: Joi.string().allow(""),
  price: Joi.number().required(),
  category: Joi.string().valid("extras", "mainCourse").required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
  // image: Joi.object({
  //   url: Joi.string().uri().optional(),
  //   publicId: Joi.string().optional(),
  // }).optional(),
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

const petAllergiesItemSchema = Joi.object({
  allergies: Joi.array().items(Joi.string()).default([]),
  name: Joi.string().allow("").optional(),
  petId: Joi.string().optional(),
});

const recipesByAllergiesValidation = Joi.object({
  pets: Joi.array()
    .items(petAllergiesItemSchema)
    .min(1)
    .max(2)
    .required()
    .messages({
      "array.min": "At least one pet with allergies is required",
      "array.max": "Maximum 2 pets supported",
    }),
});

module.exports = {
  recipeValidation,
  updateRecipeValidation,
  recipesByAllergiesValidation,
};
