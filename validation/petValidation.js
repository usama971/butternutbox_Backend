const Joi = require('joi');
const objectId = require('joi-objectid')(Joi);

const petValidation = Joi.object({
  userId: Joi.string().required(),
  name: Joi.string().required(),
  gender: Joi.string().required(),
  behavior: Joi.string().required(),
  food: Joi.array().items(Joi.string()).default([]),
  behaviorFussy: Joi.string().required(),
  importantFood: Joi.string().required(),
  bodyType: Joi.string().required(),
  weight: Joi.number().allow(null),
  activity: Joi.string().required(),
  allergies: Joi.array().items(Joi.string()).default([]),
  healthIssues: Joi.array().items(Joi.string()).default([]),
  snacks: Joi.array().required(),
  selectedHealthIssues: Joi.array().required(),
  breed: Joi.string().required(),
  ageGroup: Joi.string().required(),
  age: Joi.number().allow(null),
  workingDog: Joi.boolean().optional(),
  health: Joi.string().required(),
  healthCondition: Joi.string().allow('').optional(),
});

module.exports = petValidation;
