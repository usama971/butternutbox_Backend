const Recipe = require("../Models/recipe");
const {
  recipeValidation,
  updateRecipeValidation,
} = require("../validation/recipeValidation");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

// exports.createRecipe = async (req, res) => {
//   try {
//     const { error } = recipeValidation.validate(req.body);
//     if (error) return res.status(400).json({ error: error.details[0].message });

//     const recipeExists = await Recipe.findOne({ name: req.body.name });
//     if (recipeExists) return res.status(400).json({ error: 'Recipe already exists' });

//     const recipe = new Recipe(req.body);
//     await recipe.save();
//     res.status(201).json({ message: 'Recipe created', data: recipe });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.createRecipe = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // Inject adminId from token
//     req.body.adminId = req.user.userId;

//     // 1️⃣ Validate body
//     const { error } = recipeValidation.validate(req.body);
//     if (error) {
//       return res.status(400).json({ error: error.details[0].message });
//     }

//     // 2️⃣ Check duplicate recipe
//     const recipeExists = await Recipe.findOne({ name: req.body.name }).session(session);
//     if (recipeExists) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(409).json({ error: "Recipe already exists" });
//     }

//     // 3️⃣ Handle image (Cloudinary)
//     let image = {};
//     if (req.file) {
//       image = {
//         url: req.file.path,       // Cloudinary secure_url
//         publicId: req.file.filename // Cloudinary public_id
//       };
//     }

//     // 4️⃣ Save recipe in MongoDB
//     const recipe = new Recipe({
//       ...req.body,
//       image,
//     });
//     await recipe.save({ session });

//     // 5️⃣ Commit transaction
//     await session.commitTransaction();
//     session.endSession();

//     res.status(201).json({
//       message: "Recipe created successfully",
//       data: recipe,
//     });

//   } catch (err) {
//     // Rollback transaction
//     await session.abortTransaction();
//     session.endSession();

//     // Delete uploaded image if exists
//     if (req.file && req.file.filename) {
//       try {
//         await cloudinary.uploader.destroy(req.file.filename);
//       } catch (cloudErr) {
//         console.error("Cloudinary rollback failed:", cloudErr);
//       }
//     }

//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

exports.createRecipe = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    req.body.adminId = req.user.userId;

    const recipe = new Recipe({
      ...req.body,
      image: {
        url: req.file.path,
        publicId: req.file.filename,
      },
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

    // Rollback image
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }

    res.status(500).json({ error: err.message });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;

    console.log("req.body: ", req.body);
    // 1️⃣ Validate request body (partial update allowed)
    const { error } = updateRecipeValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 2️⃣ Find the recipe
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // 3️⃣ Check admin authorization (only creator can update)
    if (recipe.adminId.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot update this recipe" });
    }

    // 4️⃣ Handle new image (if uploaded)
    if (req.file) {
      // Add new image to DB
      recipe.image = {
        url: req.file.path, // Cloudinary secure_url
        publicId: req.file.filename, // Cloudinary public_id
      };
      // Previous image remains untouched in Cloudinary
    }

    // 5️⃣ Update other fields
    Object.keys(req.body).forEach((key) => {
      if (key !== "image") {
        // avoid overwriting image object accidentally
        recipe[key] = req.body[key];
      }
    });

    // 6️⃣ Save updated recipe
    await recipe.save();

    res.status(200).json({
      message: "Recipe updated successfully",
      data: recipe,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getRecipes = async (req, res) => {
  try {
    // console.log("Get Recipes req.user:", req);
    // console.log("Get Recipes req.user:");
    const adminId = req.user.userId; // 🔐 from JWT only

    if (!adminId) {
      console.log("Unauthorized access attempt to get recipes");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const recipes = await Recipe.find({ adminId })
      // const recipes = await Recipe.find()
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
