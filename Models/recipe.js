const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', required: true },
  name: { type: String, required: true },
  description: { type: String },
  ingredients: { type: [String], default: [] },
  nutritionalInfo: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  price: { type: Number, required: true },
  category: { type: String, enum: ['extras', 'mainCourse'], required: true },
  image: {
    url: String,
    publicId: String
  },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  trackStock: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Recipe', RecipeSchema);
