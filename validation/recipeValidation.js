const Joi = require("joi");


const recipeValidation = Joi.object({
  adminId: Joi.string().required(),

  name: Joi.string().required(),

  description: Joi.string().allow("", null),

  ingredients: Joi.array()
    .items(
      Joi.object({
        ingredientId: Joi.string().required(),
        percentage: Joi.number().min(0).optional()
      })
    )
    .default([]),

  keyBenefits: Joi.array()
    .items(Joi.string())
    .default([]),

  nutritionalInfo: Joi.object({
    analyticalConstituents: Joi.object({
      crudeProtein: Joi.string().allow("", null),
      crudeFat: Joi.string().allow("", null),
      crudeFibres: Joi.string().allow("", null),
      crudeAsh: Joi.string().allow("", null),
      moisture: Joi.string().allow("", null)
    }).default({}),

    additivesPerKg: Joi.string().allow("", null)
  }).default({}),

  price: Joi.number().min(0).max(1000).optional().messages({
    "number.min": "Price must be greater than 0",
    "number.max": "Price must be less than 1000",
  }),

  category: Joi.string()
    .valid("extras", "mainCourse")
    .required(),

  status: Joi.string()
    .valid("active", "inactive")
    .default("active"),

  stock: Joi.number().min(0).required(),

  lowStockThreshold: Joi.number()
    .min(0)
    .optional(),

  trackStock: Joi.boolean().optional()
});

const updateRecipeValidation = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().optional(),
  description: Joi.string().allow('', null),

  ingredients: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional(),
      ingredientId: Joi.string().required(),
      percentage: Joi.number().min(0).optional()
    })
  ).optional(),

  keyBenefits: Joi.array().items(Joi.string()).optional(),

  nutritionalInfo: Joi.object({
    analyticalConstituents: Joi.object({
      crudeProtein: Joi.string().allow('', null),
      crudeFat: Joi.string().allow('', null),
      crudeFibres: Joi.string().allow('', null),
      crudeAsh: Joi.string().allow('', null),
      moisture: Joi.string().allow('', null)
    }).optional(),

    additivesPerKg: Joi.string().allow('', null)
  }).optional(),

  price: Joi.number().min(0).max(1000).optional().messages({
    "number.min": "Price must be greater than 0",
    "number.max": "Price must be less than 1000",
  }),

  category: Joi.string().valid('extras', 'mainCourse').optional(),

  stock: Joi.number().min(0).optional(),

  lowStockThreshold: Joi.number().min(0).optional(),

  trackStock: Joi.boolean().optional(),

  image: Joi.object({
    url: Joi.string().uri(),
    publicId: Joi.string()
  }).optional()
}).options({ presence: "optional" });


const petAllergiesItemSchema = Joi.object({
  allergies: Joi.array().items(Joi.string()).default([]),
  name: Joi.string().allow("").optional(),
  petId: Joi.string().optional(),
});

const updateRecipeStockValidation = Joi.object({
  stock: Joi.number().min(0).required(),
  lowStockThreshold: Joi.number().min(0).optional(),
  trackStock: Joi.boolean().optional(),
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
  updateRecipeStockValidation,
  recipesByAllergiesValidation,
};
