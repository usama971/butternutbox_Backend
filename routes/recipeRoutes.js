const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
// const upload = require('../controllers/middlewares/recipeUpload');
const {validateRecipeRequest } = require('../validation/recipeImageValidation');
const {upload,uploadToCloudinary } = require("../controllers/middlewares/recipeUpload"); // your multer-cloudinary config

// const authenticateJWT = require("../controllers/middlewares/authenticateJWT");
const authenticateJWT = require("../controllers/middlewares/authenticateJWT");

// router.post('/', recipeController.createRecipe);

// router.post(
//   '/',
//   upload.single('image'), // 👈 KEY MUST BE "image"
//   recipeController.createRecipe
// );


router.post(
  '/',
  upload.single('image'),         // 1️⃣ Upload file
  validateRecipeRequest,          // 2️⃣ Validate image + body
  recipeController.createRecipe   // 3️⃣ Controller saves to DB
);


router.patch(
  "/:id",
  upload.single("image"),
  recipeController.updateRecipe
);
router.get('/', recipeController.getRecipes);

module.exports = router;
