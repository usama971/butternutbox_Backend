const SuperAdmin = require('../Models/SuperAdmin');
const Subscription = require('../Models/subscription');
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
exports.createEmployee = async (req, res) => {
  try {
    // 1️⃣ Only ADMIN can create employee
    if (req.user.roleName !== "ADMIN") {
      return res.status(403).json({
        message: "Only admin can create employee"
      });
    }

    // 2️⃣ Build payload
    const newEntry = {
      ...req.body,
      roleId: "6a0abc0a2164e88875b7d626",
      // userType: "r_a94e61d0mm", // (your EMPLOYEE/Admin mapping system)

      adminId: req.user.userId, // 👈 link employee to admin

      // createdBy: req.user.userId
    };

    // 3️⃣ Normalize email BEFORE validation
    newEntry.email = newEntry.email.toLowerCase();

    // 4️⃣ Validate input
    const { error } = superAdminValidation.validate(newEntry);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }

    // 5️⃣ Check duplicate email
    const exists = await SuperAdmin.findOne({
      email: newEntry.email
    });

    if (exists) {
      return res.status(409).json({
        error: "Email already exists"
      });
    }

    // 6️⃣ Create employee
    const employee = await SuperAdmin.create(newEntry);

    let employeeData = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
    }

    // 7️⃣ Response
    return res.status(201).json({
      message: "Employee created successfully",
      data: employeeData
    });

  } catch (err) {
    console.error("Create Employee Error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};


exports.getSuperAdminsOld = async (req, res) => {
  try {
    // const admins = await SuperAdmin.find().populate('roleId');
    const admins = await SuperAdmin.find({
      email: { $ne: req.user.email } // ❌ exclude logged-in user
    }).select('-password -roleId'); // ✅ exclude passwords
    res.json({ message: 'data of users', data: admins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getSuperAdmins = async (req, res) => {
  try {

    // 1️⃣ Only ADMIN can access employees
    // if (req.user.roleName !== "ADMIN") {
    //   return res.status(403).json({
    //     message: "Only admin can view employees"
    //   });
    // }

    // 2️⃣ Get all employees created by logged-in admin
    const getSuperAdmins = await SuperAdmin.find({
      adminId: req.user.userId
    })
      .select("_id name email phone roleId createdAt")
      .populate("roleId", "-_id, roleName");

    // 3️⃣ Response
    return res.status(200).json({
      message: "SuperAdmins fetched successfully",
      totalSuperAdmins: getSuperAdmins.length,
      data: getSuperAdmins
    });

  } catch (err) {
    console.error("Get SuperAdmins Error:", err);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

exports.getEmployees = async (req, res) => {
  try {

    // 1️⃣ Only ADMIN can access employees
    if (req.user.roleName !== "ADMIN") {
      return res.status(403).json({
        message: "Only admin can view employees"
      });
    }

    // 2️⃣ Get all employees created by logged-in admin
    const getEmployees = await SuperAdmin.find({
      adminId: req.user.userId
    })
      .select("_id name email phone roleId createdAt")
      .populate("roleId", "-_id, roleName");

    // 3️⃣ Response
    return res.status(200).json({
      message: "Employees fetched successfully",
      totalEmployees: getEmployees.length,
      data: getEmployees
    });

  } catch (err) {
    console.error("Get Employees Error:", err);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};
