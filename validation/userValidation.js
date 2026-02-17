const Joi = require('joi');

const userValidation = Joi.object({
  roleId: Joi.string().optional(),
  adminId: Joi.string().allow(null, ''),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Confirm password must match password' }),
  agreeTerms: Joi.boolean().valid(true).required(),
  receiveDiscounts: Joi.boolean().optional(), 
  phone: Joi.string().allow(''),
  address: Joi.string().allow(''),
  city: Joi.string().allow(''),
  state: Joi.string().allow(''),
  houseNumber: Joi.string().allow(''),
  postCode: Joi.string().allow(''),
  country: Joi.string().allow(''),
});

const userUpdateValidation = Joi.object({
  name: Joi.string().optional(),
  phone: Joi.string().allow(''),
  address: Joi.string().allow(''),
  city: Joi.string().allow(''),
  state: Joi.string().allow(''),
  houseNumber: Joi.string().allow(''),
  postCode: Joi.string().allow(''),
  country: Joi.string().allow('')
});


module.exports = userValidation;
