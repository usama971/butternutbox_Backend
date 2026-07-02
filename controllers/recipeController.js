const Recipe = require("../Models/recipe");
const {
  recipeValidation,
  updateRecipeValidation,
  recipesByAllergiesValidation,
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
    // let recipeValidation1 = {
    //   adminId: req.user.userId,
    //   name: req.body.name,
    //   description: req.body.description,
    //   ingredients: req.body.ingredients,
    //   nutritionalInfo: req.body.nutritionalInfo,
    //   price: req.body.price,
    //   category: req.body.category,
    //   status: req.body.status,
    //   stock: req.body.stock,
    //   lowStockThreshold: req.body.lowStockThreshold
      
    // };
    // const { error } = recipeValidation.validate(recipeValidation1);
    // if (error) {
    //   return res.status(400).json({ error: error.details[0].message });
    // }

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

// exports.updateRecipe = async (req, res) => {
//   try {
//     const recipeId = req.params.id;
//     console.log("Update Recipe object:", req.body);

//     req.body.ingredients= JSON.parse(req.body.ingredients);

//     const { error } = updateRecipeValidation.validate(req.body);
//     if (error) {
//       return res.status(400).json({ error: error.details[0].message });
//     }

//     const recipe = await Recipe.findById(recipeId);
//     if (!recipe) {
//       return res.status(404).json({ message: "Recipe not found" });
//     }

//     if (recipe.adminId.toString() !== req.user.userId) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     if (req.file) {
//       // delete old image
//       if (recipe.image?.publicId) {
//         await cloudinary.uploader.destroy(recipe.image.publicId);
//       }

//       const result = await uploadToCloudinary(req.file.buffer);

//       console.log("Cloudinary upload result:", result);
//       recipe.image = {
//         url: result.secure_url,
//         publicId: result.public_id,
//       };
//     }

//     Object.keys(req.body).forEach((key) => {
//       recipe[key] = req.body[key];
//     });

//     await recipe.save();

//     res.status(200).json({
//       message: "Recipe updated successfully",
//       data: recipe,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


// new version according to the new recipe schema

exports.updateRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;

    console.log("Update Recipe body:", req.body);

    // 🔥 SAFE PARSE FUNCTION
    const safeParse = (value) => {
      if (!value) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    // 🔥 Parse only when needed
    req.body.ingredients = safeParse(req.body.ingredients);
    req.body.keyBenefits = safeParse(req.body.keyBenefits);
    req.body.nutritionalInfo = safeParse(req.body.nutritionalInfo);

    // Validate AFTER parsing
    const { error } = updateRecipeValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    if (recipe.adminId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // 🔥 IMAGE UPDATE
    if (req.file) {
      if (recipe.image?.publicId) {
        await cloudinary.uploader.destroy(recipe.image.publicId);
      }

      const result = await uploadToCloudinary(req.file.buffer);

      recipe.image = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    // 🔥 SAFE FIELD UPDATE (IMPORTANT FIX)
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        recipe[key] = req.body[key];
      }
    });

    await recipe.save();

    res.status(200).json({
      message: "Recipe updated successfully",
      data: recipe
    });

  } catch (err) {
    console.error("Update Recipe Error:", err);
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
    console.log("Get Recipes req.user: ", req.user);
    
    let adminId = req.user.userId; // 🔐 from JWT only

    if(req?.user?.adminId){
      adminId = req.user.adminId;
    }

    // if (!adminId) {
    //   console.log("Unauthorized access attempt to get recipes");
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    const recipes = await Recipe.find({ adminId , status: "active"})
      // const recipes = await Recipe.find({status: "active"})
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

function isInStock(recipe) {
  if (!recipe.trackStock) return true;
  const stock = recipe.stock ?? 0;
  return stock > 0;
}

/**
 * Check if a recipe contains any of the pet's allergies in its ingredients.
 * Uses case-insensitive substring match (e.g. "chicken" matches "Chicken breast").
 */
function recipeContainsAllergy(recipe, allergies) {
  if (!allergies?.length) return false;
  const ingredients = recipe.ingredients || [];
  return allergies.some((allergy) => {
    const a = String(allergy || "").toLowerCase().trim();
    if (!a) return false;
    return ingredients.some(
      (ing) => String(ing || "").toLowerCase().includes(a)
    );
  });
}

// exports.getRecipesByPetAllergies = async (req, res) => {
//   try {
//     const { error, value } = recipesByAllergiesValidation.validate(req.body);
//     if (error) {
//       return res.status(400).json({ error: error.details[0].message });
//     }

//     const { pets } = value;
//     const recipes = await Recipe.find({ status: "active" })
//       .sort({ createdAt: -1 })
//       .lean();

//     const data = pets.map((pet, index) => {
//       const allergies = pet.allergies || [];
//       const suggestedRecipes = [];
//       const notSuggestedRecipes = [];

//       recipes.forEach((recipe) => {
//         if (!isInStock(recipe)) return;
//         if (recipeContainsAllergy(recipe, allergies)) {
//           notSuggestedRecipes.push(recipe);
//         } else {
//           suggestedRecipes.push(recipe);
//         }
//       });

//       return {
//         petIndex: index + 1,
//         petName: pet.name || `Pet ${index + 1}`,
//         petId: pet.petId || null,
//         allergies,
//         suggestedRecipes,
//         notSuggestedRecipes,
//       };
//     });

//     res.status(200).json({
//       message: "Recipes fetched by pet allergies",
//       data,
//     });
//   } catch (err) {
//     console.error("getRecipesByPetAllergies Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

// new version according to the new recipe schema
exports.getRecipesByPetAllergiesDirect = async (req, res) => {
  try {
    const { error, value } =
      recipesByAllergiesValidation.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
      });
    }

    const { pets } = value;

    // 🔥 POPULATE INGREDIENTS
    const recipes = await Recipe.find({ status: "active" })
      .populate({
        path: "ingredients.ingredientId",
        select: "name allergenTag isActive",
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = pets.map((pet, index) => {
      const allergies = (pet.allergies || []).map(a =>
        a.toLowerCase().trim()
      );

      const suggestedRecipes = [];
      const notSuggestedRecipes = [];

      recipes.forEach((recipe) => {
        if (!isInStock(recipe)) return;

        // 🔥 NEW ALLERGY CHECK LOGIC
        const hasAllergy = recipe.ingredients.some((ing) => {
          const allergen = ing?.ingredientId?.allergenTag;
          if (!allergen) return false;

          return allergies.includes(allergen.toLowerCase());
        });

        if (hasAllergy) {
          notSuggestedRecipes.push(recipe);
        } else {
          suggestedRecipes.push(recipe);
        }
      });

      return {
        petIndex: index + 1,
        petName: pet.name || `Pet ${index + 1}`,
        petId: pet.petId || null,
        allergies,
        suggestedRecipes,
        notSuggestedRecipes,
      };
    });

    res.status(200).json({
      message: "Recipes fetched by pet allergies",
      data,
    });
  } catch (err) {
    console.error("getRecipesByPetAllergies Error:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.getRecipesByPetAllergies = async (pets) => {
  // Get all active recipes
  const recipes = await Recipe.find({ status: "active" })
    .populate({
      path: "ingredients.ingredientId",
      select: "name allergenTag isActive",
    })
    .sort({ createdAt: -1 })
    .lean();

  return pets.map((pet, index) => {
    const allergies = (pet.allergies || []).map((a) =>
      a.toLowerCase().trim()
    );

    const suggestedRecipes = [];
    const notSuggestedRecipes = [];

    recipes.forEach((recipe) => {
      if (!isInStock(recipe)) return;

      const hasAllergy = recipe.ingredients.some((ing) => {
        const allergen = ing?.ingredientId?.allergenTag;
        if (!allergen) return false;

        return allergies.includes(allergen.toLowerCase());
      });

      if (hasAllergy) {
        notSuggestedRecipes.push(recipe);
      } else {
        suggestedRecipes.push(recipe);
      }
    });

    return {
      petIndex: index + 1,
      petName: pet.name || `Pet ${index + 1}`,
      petId: pet.petId || null,
      allergies,
      suggestedRecipes,
      notSuggestedRecipes,
    };
  });
};

