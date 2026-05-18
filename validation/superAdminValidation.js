const Joi = require("joi");

const superAdminValidation = Joi.object({
  roleId: Joi.string().required(),

  adminId: Joi.string().optional(),

  // userType: Joi.string().optional(),
    // .valid("SUPER_ADMIN", "ADMIN", "EMPLOYEE")
    // .required(),

  name: Joi.string().required(),

  email: Joi.string().email().required(),

  password: Joi.string(),

  phone: Joi.string().allow("", null),

  country: Joi.string().allow("", null),

  isBlocked: Joi.boolean().optional(),

  isActive: Joi.boolean().optional()
});

module.exports = superAdminValidation;