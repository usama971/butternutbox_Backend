// controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const SuperAdmin = require("../Models/SuperAdmin");
const UserModel = require("../Models/userModel");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await SuperAdmin.findOne({ email }).populate("roleId");
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        roleName: user.roleId.roleName,
        permissions: user.roleId.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    let userType = user.roleId.userType;
    let userName = user.name;
    res.json({
      message: "Login Successful",
      token,
      userType,
      userName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await UserModel.findOne({ email }).populate("roleId");
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        roleName: user.roleId.roleName,
        permissions: user.roleId.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    let userType = user.roleId.userType;
    let userName = user.name;
    res.json({
      message: "Login Successful",
      token,
      userType,
      userName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
