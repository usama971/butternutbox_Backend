const { extrasValidation } = require("./extrasValidation");
const cloudinary = require("cloudinary").v2;
const Extras = require("../Models/extras");

const validateExtrasRequest = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Extras image is required" });
    }

    req.body.adminId = req.user.userId.toString();

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

    req.body.ingredients = safeParse(req.body.ingredients);
    req.body.keyBenefits = safeParse(req.body.keyBenefits);
    req.body.nutritionalInfo = safeParse(req.body.nutritionalInfo);
    req.body.storageAndUse = safeParse(req.body.storageAndUse);

    if (req.body.price !== undefined) {
      req.body.price = Number(req.body.price);
    }
    if (req.body.weight !== undefined) {
      req.body.weight = Number(req.body.weight);
    }
    if (req.body.stock !== undefined) {
      req.body.stock = Number(req.body.stock);
    }
    if (req.body.lowStockThreshold !== undefined) {
      req.body.lowStockThreshold = Number(req.body.lowStockThreshold);
    }
    if (req.body.trackStock !== undefined) {
      req.body.trackStock =
        req.body.trackStock === true || req.body.trackStock === "true";
    }

    const { error } = extrasValidation.validate(req.body);

    if (error) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return res.status(400).json({
        error: error.details[0].message,
      });
    }

    const extrasExists = await Extras.findOne({
      adminId: req.body.adminId,
      name: req.body.name,
    });

    if (extrasExists) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return res.status(400).json({
        error: "Extras item already exists",
      });
    }

    next();
  } catch (err) {
    console.error("Extras validation middleware error:", err);

    if (req.file?.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }

    return res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = { validateExtrasRequest };
