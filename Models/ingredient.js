const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    allergenTag: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    ingredientsBenefits: {
        type: String,
        default: null,
      },
    

    isActive: {
      type: Boolean,
      default: true, // ✅ always true by default
    },
  },
  { timestamps: true }
);

// case-insensitive unique name
IngredientSchema.index(
  {adminId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Ingredient", IngredientSchema);