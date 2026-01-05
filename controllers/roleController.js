const Role = require('../Models/role');
const roleValidation = require('../validation/roleValidation');

exports.createRole = async (req, res) => {
  try {
    const { error } = roleValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const roleExists = await Role.findOne({ roleName: req.body.roleName });
    if (roleExists) return res.status(409).json({ error: 'Role already exists' });

    const newRole = new Role(req.body);
    await newRole.save();

    res.status(201).json({ message: 'Role created successfully', data: newRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json({ message: 'Roles fetched successfully', data: roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
