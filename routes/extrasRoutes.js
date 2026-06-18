const express = require("express");
const router = express.Router();
const extrasController = require("../controllers/extrasController");
const { validateExtrasRequest } = require("../validation/extrasImageValidation");
const { upload } = require("../controllers/middlewares/recipeUpload");

router.post(
  "/",
  upload.single("image"),
  validateExtrasRequest,
  extrasController.createExtras
);

router.patch(
  "/:id",
  upload.single("image"),
  extrasController.updateExtras
);

router.patch(
  "/updateStatus/:id",
  extrasController.updateExtrasStatus
);

router.get("/", extrasController.getExtras);

module.exports = router;
