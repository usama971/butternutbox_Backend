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


exports.validatePromoCode = async (req, res) => {
  try {
    console.log("Validate Promo Code Request Body:", req.body);
    const { code, orderTotal, userId } = req.body;

    if (!code || !orderTotal) {
      return res.status(400).json({
        valid: false,
        message: "Promo code and order total are required",
      });
    }

    const promo = await PromoCode.findOne({ code });

    if (!promo) {
      return res.status(404).json({
        valid: false,
        message: "Invalid promo code",
      });
    }

    // Status check
    if (promo.status !== "active") {
      return res.status(400).json({
        valid: false,
        message: "Promo code is not active",
      });
    }

    const now = new Date();

    // Date check
    if (now < promo.startDate || now > promo.endDate) {
      return res.status(400).json({
        valid: false,
        message: "Promo code expired",
      });
    }

    // Minimum order check
    if (orderTotal < promo.minOrder) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order amount is ${promo.minOrder}`,
      });
    }

    // Usage limit check
    if (promo.used >= promo.numberOfPromoCodes) {
      return res.status(400).json({
        valid: false,
        message: "Promo code usage limit reached",
      });
    }

    // 🧮 Discount calculation
    let discountAmount = 0;

    if (promo.promoType === "percentage") {
      discountAmount = (orderTotal * promo.discount) / 100;
    } else if (promo.promoType === "fixed") {
      discountAmount = promo.discount;
    } else if (promo.promoType === "shipping") {
      discountAmount = 0; // shipping logic handled elsewhere
    }

    const finalAmount = orderTotal - discountAmount;

    return res.status(200).json({
      valid: true,
      code: promo.code,
      promoType: promo.promoType,
      discountValue: promo.discount,
      discountAmount,
      finalAmount,
      message: "Promo code applied successfully",
    });
  } catch (error) {
    console.error("Promo validation error:", error);
    res.status(500).json({
      valid: false,
      message: "Server error while validating promo code",
    });
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
