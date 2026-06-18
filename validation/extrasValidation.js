const Joi = require("joi");

const extrasValidation = Joi.object({
  adminId: Joi.string().required(),

  name: Joi.string().required(),

  description: Joi.string().allow("", null),

  price: Joi.number().min(0).required(),

  weight: Joi.number().min(0).required(),

  status: Joi.string().valid("active", "inactive").default("active"),

  stock: Joi.number().min(0).required(),

  lowStockThreshold: Joi.number().min(0).optional(),

  trackStock: Joi.boolean().optional(),

  ingredients: Joi.array()
    .items(
      Joi.object({
        ingredientId: Joi.string().required(),
      })
    )
    .default([]),

  productBenefits: Joi.array().items(Joi.string()).default([]),

  keyBenefits: Joi.array().items(Joi.string()).default([]),

  nutritionalInfo: Joi.object({
    analyticalConstituents: Joi.object({
      crudeProtein: Joi.string().allow("", null),
      crudeFat: Joi.string().allow("", null),
      crudeFibres: Joi.string().allow("", null),
      crudeAsh: Joi.string().allow("", null),
      moisture: Joi.string().allow("", null),
    }).default({}),
    additivesPerKg: Joi.string().allow("", null),
  }).default({}),

  Composition: Joi.string().allow("", null),

  TechnologicalAdditives: Joi.string().allow("", null),

  storageAndUse: Joi.array().items(Joi.string()).default([]),
});

const updateExtrasValidation = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().allow("", null),
  price: Joi.number().min(0).optional(),
  weight: Joi.number().min(0).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  stock: Joi.number().min(0).optional(),
  lowStockThreshold: Joi.number().min(0).optional(),
  trackStock: Joi.boolean().optional(),
  ingredients: Joi.array()
    .items(
      Joi.object({
        ingredientId: Joi.string().required(),
      })
    )
    .optional(),
  keyBenefits: Joi.array().items(Joi.string()).optional(),
  nutritionalInfo: Joi.object({
    analyticalConstituents: Joi.object({
      crudeProtein: Joi.string().allow("", null),
      crudeFat: Joi.string().allow("", null),
      crudeFibres: Joi.string().allow("", null),
      crudeAsh: Joi.string().allow("", null),
      moisture: Joi.string().allow("", null),
    }).optional(),
    additivesPerKg: Joi.string().allow("", null),
  }).optional(),
  Composition: Joi.string().allow("", null),
  TechnologicalAdditives: Joi.string().allow("", null),
  storageAndUse: Joi.array().items(Joi.string()).optional(),
  image: Joi.object({
    url: Joi.string().uri(),
    publicId: Joi.string(),
  }).optional(),
}).options({ presence: "optional" });

module.exports = {
  extrasValidation,
  updateExtrasValidation,
};
