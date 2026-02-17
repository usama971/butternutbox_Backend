const Joi = require('joi');
const objectId = require('joi-objectid')(Joi);

const petValidation = Joi.object({
  userId: Joi.string().optional(),
  name: Joi.string().required(),
  gender: Joi.string().required(),
  behavior: Joi.string().required(),
  food: Joi.array().items(Joi.string()).default([]),
  behaviorFussy: Joi.string().required(),
  importantFood: Joi.string().required(),
  bodyType: Joi.string().required(),
  weight: Joi.number().allow(null),
  activity: Joi.string().required(),
  fussyEater: Joi.string().required(),
  importantFoodItem: Joi.string().required(),
  bodyCondition: Joi.string().required(),
  activityLevel: Joi.string().required(),
  allergies: Joi.array().items(Joi.string()).default([]),
  healthIssues: Joi.array().items(Joi.string()).default([]),
  snacks: Joi.array().required(),
  selectedHealthIssues: Joi.array().required(),
  breed: Joi.string().required(),
  ageGroup: Joi.string().required(),
  age: Joi.number().allow(null),
  month: Joi.number().allow(null),
  week: Joi.number().allow(null),
  year: Joi.number().allow(null),
  workingDog: Joi.boolean().optional(),
  guess: Joi.boolean().optional(),
  notBroughtHomeYet: Joi.boolean().optional(),
  dontKnowBreed: Joi.boolean().optional(),
  health: Joi.string().required(),
  healthCondition: Joi.string().allow('').optional(),
});

module.exports = petValidation;
