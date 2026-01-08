const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  roleName: { type: String, required: true, unique: true },
  description: { type: String },
  userType: { type: String, required: true }, 
  permissions: { type: [String], default: [] }, // e.g., ['user','admin','superAdmin']
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
