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
  console.log("Create Employee req.body:", req.body);
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

exports.updateEmployee = async (req, res) => {
  try {

    // 1️⃣ Only ADMIN can update employee
    if (req.user.roleName !== "ADMIN") {
      return res.status(403).json({
        message: "Only admin can update employee"
      });
    }


    const employeeId = req.params.id;

    // 2️⃣ Find employee FIRST
    const employee = await SuperAdmin.findOne({
      _id: employeeId,
      adminId: req.user.userId
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    // 3️⃣ Normalize email (if provided)
    const newEmail = req.body.email
      ? req.body.email.toLowerCase()
      : null;

    // 4️⃣ CHECK EMAIL ONLY AFTER FINDING DOCUMENT
    if (newEmail) {
      const emailExists = await SuperAdmin.findOne({
        email: newEmail,
        _id: { $ne: employeeId }   // 👈 exclude current document
      });

      if (emailExists) {
        return res.status(409).json({
          message: "Email already exists, please use another email"
        });
      }
    }

    // 5️⃣ Build update object (ONLY allowed fields)
    const updates = {
      ...(req.body.name && { name: req.body.name }),
      ...(newEmail && { email: newEmail }),
      ...(req.body.phone && { phone: req.body.phone })
    };

    // 6️⃣ Update document
    const updatedEmployee = await SuperAdmin.findByIdAndUpdate(
      employeeId,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    // 7️⃣ Response (safe fields only)
    return res.status(200).json({
      message: "Employee updated successfully",
      data: {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        isActive: updatedEmployee.isActive
      }
    });

  } catch (err) {
    console.error("Update Employee Error:", err);

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
      .select("_id name email phone roleId isActive createdAt")
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
console.log("Get Employees req.user:", req.user);
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

      console.log("Get Employees getEmployees:", getEmployees);

      let isActive = getEmployees.map((employee) => employee.isActive==true);

      let inActive = getEmployees.map((employee) => employee.isActive==false);
      console.log("Get Employees isActive:", isActive.length);
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
