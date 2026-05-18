const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SuperAdminSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null
    },

    // createdBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "SuperAdmin",
    //   default: null
    // },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    phone: { type: String },
    country: { type: String },

    isActive: {
      type: Boolean,
      default: true
    },

    isBlocked: {
      type: Boolean,
      default: false
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    passwordUpdatedAt: {
      type: Date,
      default: Date.now
    },

    // userType: {
    //   type: String,
    //   // enum: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"],
    //   // default: "EMPLOYEE"
    // },
  },
  { timestamps: true }
);

// password hashing
SuperAdminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  this.passwordUpdatedAt = new Date();
});

module.exports = mongoose.model("SuperAdmin", SuperAdminSchema);