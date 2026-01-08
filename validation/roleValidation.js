const Joi = require('joi');

const roleValidation = Joi.object({
  roleName: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  userType: Joi.string().required(),
  permissions: Joi.array().required(),
});

module.exports = roleValidation;
