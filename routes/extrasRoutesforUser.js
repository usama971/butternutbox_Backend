const express = require("express");
const router = express.Router();
const extrasController = require("../controllers/extrasController");
const { validateExtrasRequest } = require("../validation/extrasImageValidation");
const { upload } = require("../controllers/middlewares/recipeUpload");


router.get("/getAll", extrasController.getAllExtras);

module.exports = router;
