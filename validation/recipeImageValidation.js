// const upload = require("../controllers/middlewares/recipeUpload"); // your multer-cloudinary config
const { recipeValidation } = require("../validation/recipeValidation");
const cloudinary = require("cloudinary").v2;
const Recipe = require("../Models/recipe");

// Middleware to validate image & recipe body
const validateRecipeRequest = async (req, res, next) => {
  try {
    // 1️⃣ Check if image is present
    if (!req.file) {
      return res.status(400).json({ error: "Recipe image is required" });
    }

    req.body.adminId = req.user.userId;
    console.log("admin id in validation:", req.body);
    // 2️⃣ Validate recipe body
    const { error } = recipeValidation.validate(req.body);
    if (error) {
      console.log("Validation error:", error.details[0].message);
      // Delete uploaded image since validation failed
      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(400).json({ error: error.details[0].message });
    }

    const recipeExists = await Recipe.findOne({
      adminId: req.body.adminId,
      name: req.body.name,
    });
    console.log("Recipe exists check:", recipeExists);
    if (recipeExists) {
      // await cloudinary.uploader.destroy(req.file.filename);

      return res.status(400).json({ error: "Recipe already exists" });
    }

    next(); // continue to controller
  } catch (err) {
    // Delete uploaded image on unexpected error
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(500).json({ error: err.message });
  }
};

module.exports = { validateRecipeRequest };
