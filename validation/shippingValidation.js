const Joi = require('joi');

const shippingValidation = Joi.object({
  orderId: Joi.string().required(),
  shippingAddress: Joi.string().allow(''),
  shippingCity: Joi.string().allow(''),
  shippingState: Joi.string().allow(''),
  shippingPostalCode: Joi.string().allow(''),
  shippingCountry: Joi.string().allow(''),
  trackingNumber: Joi.string().allow(''),
  shippingCompany: Joi.string().allow(''),
});

module.exports = shippingValidation;
