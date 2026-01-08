const SuperAdmin = require('../Models/SuperAdmin');
const superAdminValidation = require('../validation/superAdminValidation');



exports.createSuperAdmin = async (req, res) => {
  try {
    // 1️⃣ Add backend-required fields before validation
    const newEntry = {
      ...req.body,
      userType: "r_c2d7e91a5f" // adding Admin userType
    };

    // 2️⃣ Validate (now userType exists)
    const { error } = superAdminValidation.validate(newEntry);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 3️⃣ Normalize email
    const email = newEntry.email.toLowerCase();

    // 4️⃣ Check if email already exists
    const exists = await SuperAdmin.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // 5️⃣ Save
    const newAdmin = await SuperAdmin.create({
      ...newEntry,
      email // ensure normalized email
    });

    // 6️⃣ Respond
    return res.status(201).json({
      message: "Admin created successfully",
      data: newAdmin
    });

  } catch (err) {
    console.error("Create SuperAdmin Error:", err);
    return res.status(500).json({ error: "Internal server error" });
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
