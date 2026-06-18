const mongoose = require('mongoose');

const ExtrasSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', required: true },
  name: { type: String, required: true },
  description: { type: String },
  // ingredients: { type: [String], default: [] },
  // nutritionalInfo: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // price should be double or float
  // price: { type: mongoose.Schema.Types.Decimal128, required: true },
  price: { type: Number, required: true },
  weight: { type: Number, required: true },
  // category: { type: String, enum: ['extras', 'mainCourse'], required: true },
  image: {
    url: String,
    publicId: String
  },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 1, min: 0 },
  trackStock: { type: Boolean, default: true },

  // 1. UPGRADED: Rich ingredient structure for percentages and benefits
  ingredients: [{
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    // percentage: { type: Number }, // e.g., 60 for 60% Turkey
  }],

  // 3. NEW: UI highlights like "Low in fat" or "Easy to digest"
  productBenefits: { type: [String], default: [] },
  keyBenefits: { type: [String], default: [] },

  // 4. UPGRADED: Structured nutritional panel data
  nutritionalInfo: {
    analyticalConstituents: {
      crudeProtein: { type: String }, // e.g., "13%"
      crudeFat: { type: String },     // e.g., "5.5%"
      crudeFibres: { type: String },
      crudeAsh: { type: String },
      moisture: { type: String }
    },
    additivesPerKg: { type: String } // For text listing added vitamins/minerals
  },

  Composition: {
    type: String,
  },

  TechnologicalAdditives: {
    type: String,
  },

  storageAndUse: { type: [String], default: [] },

}, { timestamps: true });

module.exports = mongoose.model('extras', ExtrasSchema);
