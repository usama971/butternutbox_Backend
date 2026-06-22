const Extras = require("../Models/extras");
const { updateExtrasValidation } = require("../validation/extrasValidation");
const { uploadToCloudinary } = require("../controllers/middlewares/recipeUpload");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

exports.createExtras = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
console.log("req.body", req.body);
  try {
    req.body.adminId = req.user.userId;

    let imageData = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageData = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const extras = new Extras({
      ...req.body,
      image: imageData,
    });

    await extras.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Extras created successfully",
      data: extras,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

exports.updateExtras = async (req, res) => {
  try {
    const extrasId = req.params.id;

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
    req.body.productBenefits = safeParse(req.body.productBenefits);
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

    const { error } = updateExtrasValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
      });
    }

    const extras = await Extras.findById(extrasId);
    if (!extras) {
      return res.status(404).json({ message: "Extras not found" });
    }

    if (extras.adminId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.file) {
      if (extras.image?.publicId) {
        await cloudinary.uploader.destroy(extras.image.publicId);
      }

      const result = await uploadToCloudinary(req.file.buffer);
      extras.image = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        extras[key] = req.body[key];
      }
    });

    await extras.save();

    res.status(200).json({
      message: "Extras updated successfully",
      data: extras,
    });
  } catch (err) {
    console.error("Update Extras Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateExtrasStatus = async (req, res) => {
  try {
    const extrasId = req.params.id;
    const adminId = req.user.userId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const extras = await Extras.findOne({
      _id: extrasId,
      adminId,
    });

    if (!extras) {
      return res.status(403).json({
        message: "Extras not found or access denied",
      });
    }

    extras.status = status;
    await extras.save();

    res.status(200).json({
      message: "Extras status updated successfully",
      data: {
        status: extras.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getExtras = async (req, res) => {
  try {
    const adminId = req.user.userId;

    const extras = await Extras.find({ adminId, status: "active" })
      .populate({
        path: "ingredients.ingredientId",
        select: "name allergenTag ingredientsBenefits isActive",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Extras fetched successfully",
      count: extras.length,
      data: extras,
    });
  } catch (err) {
    console.error("Get Extras Error:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.getAllExtras = async (req, res) => {
  try {
    // const adminId = req.user.userId;

    const extras = await Extras.find({ status: "active" })
      .populate({
        path: "ingredients.ingredientId",
        select: "name allergenTag ingredientsBenefits isActive",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Extras fetched successfully",
      count: extras.length,
      data: extras,
    });
  } catch (err) {
    console.error("Get Extras Error:", err);
    res.status(500).json({ error: err.message });
  }
};
