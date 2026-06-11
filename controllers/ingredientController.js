const Ingredient = require("../Models/ingredient");
const { ingredientValidation } = require("../validation/ingredient");

exports.createIngredient = async (req, res) => {
    try {

        const { error } = ingredientValidation(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        const { name, allergenTag, ingredientsBenefits } = req.body;

        const existing = await Ingredient.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
            adminId: req.user.userId,
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Ingredient already exists",
            });
        }

        console.log("req.user.userId:", req.user.userId);
        console.log("name:", name);
        console.log("allergenTag:", allergenTag);

        const ingredient = await Ingredient.create({
            adminId: req.user.userId,
            name,
            allergenTag,
            ingredientsBenefits,
            // isActive automatically true
        });

        res.status(201).json({
            success: true,
            message: "Ingredient created",
            data: ingredient,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getAllIngredients = async (req, res) => {
    try {

        let adminId = req.user.userId;
        const ingredients = await Ingredient.find({ adminId, isActive: true })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: ingredients,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.updateIngredient = async (req, res) => {
    try {
      const { error } = ingredientValidation(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
  
      const ingredient = await Ingredient.findOne({
        _id: req.params.id,
        adminId: req.user.userId,
      });
  
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: "Ingredient not found",
        });
      }
  
      if (req.body.name) {
        const duplicate = await Ingredient.findOne({
          _id: { $ne: req.params.id },
          adminId: req.user.userId,
          name: { $regex: `^${req.body.name}$`, $options: "i" },
        });
  
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "Ingredient already exists",
          });
        }
      }
  
      Object.assign(ingredient, req.body);
      await ingredient.save();
  
      res.status(200).json({
        success: true,
        message: "Ingredient updated",
        data: ingredient,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };



  exports.deleteIngredient = async (req, res) => {
    try {
      const ingredient = await Ingredient.findOneAndDelete({
        _id: req.params.id,
        adminId: req.user.userId,
      });
  
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: "Ingredient not found",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Ingredient deleted",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

