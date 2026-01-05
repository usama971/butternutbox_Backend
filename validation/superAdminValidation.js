const Joi = require('joi');

const superAdminValidation = Joi.object({
  roleId: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow(''),
  country: Joi.string().allow(''),
});

module.exports = superAdminValidation;
