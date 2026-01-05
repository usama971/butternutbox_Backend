const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', required: true },
  name: { type: String, required: true },
  description: { type: String },
  ingredients: { type: [String], default: [] },
  nutritionalInfo: { type: String },
  price: { type: Number, required: true },
  category: { type: String, enum: ['extras', 'mainCourse'], required: true },
    image: {
    url: String,
    publicId: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', RecipeSchema);
