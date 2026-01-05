const Joi = require('joi');

const roleValidation = Joi.object({
  roleName: Joi.string().required(),
  description: Joi.string().allow(''),
  permissions: Joi.array().required(),
});

module.exports = roleValidation;
