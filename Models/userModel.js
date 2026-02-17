const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: () => new mongoose.Types.ObjectId("694b9e2f0147a7b5ce97d08b"),
      required: true,
    },

    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin" },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // confirmPassword: { type: String, required: true },
    agreeTerms: { type: Boolean, required: true },
    receiveDiscounts: { type: Boolean, default: false },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    houseNumber: { type: String },
    postCode: { type: String },
    country: { type: String },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true },
);

// Password hashing
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model("User", UserSchema);
