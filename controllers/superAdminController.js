const SuperAdmin = require('../Models/SuperAdmin');
const superAdminValidation = require('../validation/superAdminValidation');

exports.createSuperAdmin = async (req, res) => {
  try {
    const { error } = superAdminValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const exists = await SuperAdmin.findOne({ email: req.body.email });
    if (exists) return res.status(400).json({ error: 'Email already exists' });

    const newAdmin = new SuperAdmin(req.body);
    await newAdmin.save();
    res.status(201).json({ message: 'SuperAdmin created', data: newAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSuperAdmins = async (req, res) => {
  try {
    const admins = await SuperAdmin.find().populate('roleId');
    res.json({ message: 'SuperAdmins fetched', data: admins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
