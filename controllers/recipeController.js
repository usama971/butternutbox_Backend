const Recipe = require("../Models/recipe");
const {
  recipeValidation,
  updateRecipeValidation,
} = require("../validation/recipeValidation");
const {
  upload,
  uploadToCloudinary,
} = require("../controllers/middlewares/recipeUpload"); // your multer-cloudinary config

const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

exports.createRecipe = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    req.body.adminId = req.user.userId;

    let imageData = null;
    console.log("req.file:");
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      console.log("Cloudinary upload result:", result);
      imageData = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const recipe = new Recipe({
      ...req.body,
      image: imageData,
    });

    await recipe.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Recipe created successfully",
      data: recipe,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    console.log("Update Recipe object:", req.body);

    req.body.ingredients= JSON.parse(req.body.ingredients);

    const { error } = updateRecipeValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    if (recipe.adminId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.file) {
      // delete old image
      if (recipe.image?.publicId) {
        await cloudinary.uploader.destroy(recipe.image.publicId);
      }

      const result = await uploadToCloudinary(req.file.buffer);

      console.log("Cloudinary upload result:", result);
      recipe.image = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    Object.keys(req.body).forEach((key) => {
      recipe[key] = req.body[key];
    });

    await recipe.save();

    res.status(200).json({
      message: "Recipe updated successfully",
      data: recipe,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRecipeStatus = async (req, res) => {
  try {
    console.log("Update Recipe Status req.params:", req.params);
    console.log("Update Recipe Status req.body:", req.body);
    const recipeId = req.params.id;
    const adminId = req.user.userId;
    const { status } = req.body;
    

    // 1. Validate status only
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // 2. Find recipe & check ownership
    const recipe = await Recipe.findOne({
      _id: recipeId,
      adminId: adminId
    });

    if (!recipe) {
      return res.status(403).json({
        message: "Recipe not found or access denied"
      });
    }

    // 3. Update status only
    recipe.status = status;
    await recipe.save();

    res.status(200).json({
      message: "Recipe status updated successfully",
      data: {
        // _id: recipe._id,
        status: recipe.status
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getRecipes = async (req, res) => {
  try {
    // console.log("Get Recipes req.user:", req);
    console.log("Get Recipes req.user:");
    // const adminId = req.user.userId; // 🔐 from JWT only

    // if (!adminId) {
    //   console.log("Unauthorized access attempt to get recipes");
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    // const recipes = await Recipe.find({ adminId })
      const recipes = await Recipe.find()
      .sort({ createdAt: -1 }); // newest first (optional)

    res.status(200).json({
      message: "Recipes fetched successfully",
      count: recipes.length,
      data: recipes,
    });
  } catch (err) {
    console.error("Get Recipes Error:", err);
    res.status(500).json({ error: err.message });
  }
};
