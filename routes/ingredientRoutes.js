const router = require("express").Router();
const { createIngredient, getAllIngredients, updateIngredient, deleteIngredient } = require("../controllers/ingredientController");
const authorizePermissions = require('../controllers/middlewares/authorizePermissions');
const authenticateJWT = require('../controllers/middlewares/authenticateJWT');

router.post("/add", authenticateJWT, authorizePermissions(['MANAGE_INGREDIENTS']), createIngredient);
router.get("/all", authenticateJWT, authorizePermissions(['MANAGE_INGREDIENTS']), getAllIngredients);
router.patch("/update/:id", authenticateJWT, authorizePermissions(['MANAGE_INGREDIENTS']), updateIngredient);
router.delete("/delete/:id", authenticateJWT, authorizePermissions(['MANAGE_INGREDIENTS']), deleteIngredient);

module.exports = router;