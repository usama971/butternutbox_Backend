const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SuperAdminSchema = new mongoose.Schema({
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  country: { type: String },
}, { timestamps: true });

// ✅ Correct pre-save hook (NO next)
SuperAdminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('SuperAdmin', SuperAdminSchema);
