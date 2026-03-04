const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

router.post('/by-allergies', recipeController.getRecipesByPetAllergies);
router.get('/', recipeController.getRecipes);

module.exports = router;
