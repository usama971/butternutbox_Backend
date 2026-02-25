// controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const SuperAdmin = require("../Models/SuperAdmin");
const UserModel = require("../Models/userModel");
const sendEmail = require("../services/emailService");
const { getUserOtpTemplate } = require("../utils/emailTemplatesOTP");

const login = async (req, res) => {
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
      { expiresIn: "7d" },
    );
    let userType = user.roleId.userType;
    let userName = user.name;
    res.json({
      message: "Login Successful",
      token,
      userType,
      userName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const forgotPassword = (Model) => async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No user found with this email." });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = otp;
    user.otpExpiresAt = expiresAt;
    await user.save();

    await sendEmail({
      // to: user.email || process.env.ADMIN_EMAIL, // Fallback to admin email if user email is missing
      to: [user.email, process.env.ADMIN_EMAIL], // Fallback to admin email if user email is missing
      subject: "Your Verification Code",
      html: getUserOtpTemplate(user.name, otp),
    });

    return res.status(200).json({
      message: "OTP has been sent to your email and is valid for 10 minutes.",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const verifyOTP = (Model) => async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("Verify OTP request body:", req.body);

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const user = await Model.findOne({ email });
    if (!user || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: "OTP has expired." });
    }

    // OTP is valid – you can now allow password reset
    return res
      .status(200)
      .json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const resetPassword = (Model) => async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    console.log("Reset Password request body:", req.body);
    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ error: "Email, OTP, and new password are required." });
    }

    const user = await Model.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP or email." });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: "OTP has expired." });
    }

    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    user.password = password; // Will be hashed by pre-save hook
    user.otp = null;
    user.otpExpiresAt = null;

    await user.save();

    return res
      .status(200)
      .json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

function isStrongPassword(password) {
  const minLength = 8;
  const maxLength = 20;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[-!@#$%^&*_+~`|:;?,./="\\]/.test(password);

  return (
    password.length >= minLength &&
    password.length <= maxLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial
  );
}

const updatePassword = (Model) => async (req, res) => {
  console.log("Update password request body:", req.body);
  try {
    const { email, currentPassword, newPassword } = req.body;

    // Validate input
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Email, current password, and new password are required.",
      });
    }

    // Length & Strength Validation
    // if (!isStrongPassword(newPassword)) {
    //   return res.status(400).json({
    //     error:
    //       "Password must be 8–20 characters long and include uppercase, lowercase, number, and special character.",
    //   });
    // }

    // Prevent new password from being the same as the current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from the current password.",
      });
    }

    // Find the user
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // Hash the new password
    // const salt = await bcrypt.genSalt(10);
    // const newHashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    user.password = newPassword; // Will be hashed by pre-save hook
    user.passwordUpdatedAt = Date.now(); // Update timestamp
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password update error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("login user request",email, password);
    const user = await UserModel.findOne({ email }).populate("roleId");
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2️⃣ Check if user is blocked ⭐
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
      });
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
      { expiresIn: "7d" },
    );
    let userType = user.roleId.userType;
    let userName = user.name;
    res.json({
      message: "Login Successful",
      token,
      userType,
      userName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  login,
  loginUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
  updatePassword,
};
