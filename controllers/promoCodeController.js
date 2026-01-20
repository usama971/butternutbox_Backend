const PromoCode = require("../Models/promoCode");
const {
  createPromoCodeValidation,
  updatePromoCodeValidation,
} = require("../validation/promoCodeValidation");

// ---------------- Create ----------------
exports.createPromoCode = async (req, res) => {
  try {
    let adminId = req.user.userId;
    req.body.adminId = adminId;
    const { error } = createPromoCodeValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { code } = req.body;
    // Check for duplicate code for the same admin
    const existingCode = await PromoCode.findOne({ adminId, code });
    if (existingCode) {
      return res
        .status(409)
        .json({ message: "This promo code already exists for this admin" });
    }

    const promo = new PromoCode(req.body);
    await promo.save();

    res
      .status(201)
      .json({ message: "Promo code created successfully", data: promo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Get All ----------------
exports.getAllPromoCodes = async (req, res) => {
  try {
    const promos = await PromoCode.find();
    res.status(200).json({ data: promos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Get One ----------------
exports.getPromoCodeById = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo)
      return res.status(404).json({ message: "Promo code not found" });

    res.status(200).json({ data: promo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Update ----------------
exports.updatePromoCode = async (req, res) => {
  try {
     let adminId = req.user.userId;
    req.body.adminId = adminId;
    console.log("Update Request Body:", req.body);
    const { error } = updatePromoCodeValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const allowedFields = [
      "status",
      "endDate",
      "limitPerUser",
      "numberOfPromoCodes",
    ];
    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const updatedPromo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true },
    );
    if (!updatedPromo)
      return res.status(404).json({ message: "Promo code not found" });

    res
      .status(200)
      .json({ message: "Promo code updated successfully", data: updatedPromo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Delete ----------------
exports.deletePromoCode = async (req, res) => {
  try {
    const deletedPromo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!deletedPromo)
      return res.status(404).json({ message: "Promo code not found" });

    res
      .status(200)
      .json({ message: "Promo code deleted successfully", data: deletedPromo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
