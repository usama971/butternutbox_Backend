const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: () => new mongoose.Types.ObjectId("6943eba7899e3a9d0b81f362"),
      required: true,
    },

    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin" },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: true },
    agreeTerms: { type: Boolean, required: true },
    receiveDiscounts: { type: Boolean, default: false },  
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    houseNumber: { type: String },
    postCode: { type: String },
    country: { type: String },
  },
  { timestamps: true }
);

// Password hashing
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

module.exports = mongoose.model("User", UserSchema);
