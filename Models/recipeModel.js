const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    userFK: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    ingredients: {
      type: String, // storing as text
      required: true,
    },

    nutritional_info: {
      type: String,
      required: true,
    },

    price: {
      type: Number, // decimal handled as Number in MongoDB
      required: true,
      min: 0,
    },

    stock_quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
    //   enum: ["Puppy", "Adult", "Senior", "Diet", "Special"], // optional, adjust as needed
    },
  },
  {
    timestamps: true, // creates createdAt & updatedAt automatically
  }
);

module.exports = mongoose.model("Recipe", RecipeSchema, "recipes");
