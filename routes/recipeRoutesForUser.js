const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

router.post('/by-allergies', recipeController.getRecipesByPetAllergiesDirect);
// router.get('/', recipeController.getRecipes);

module.exports = router;
