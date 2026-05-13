const User = require("../Models/userModel");
const Lead = require("../Models/lead");

const createLead = async (req, res) => {
  try {
    const { name, email } = req.body;

    // validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(200).json({
        exists: true, // frontend will hide password fields
        message: "User already exists",
      });
    }

    // check if lead already exists
    const existingLead = await Lead.findOne({ email });

    // if lead already exists
    if (existingLead) {
      return res.status(200).json({
        exists: false, // frontend will show password fields
        message: "Lead already exists",
      });
    }

    // create new lead
    const lead = await Lead.create({
      name,
      email,
    });

    return res.status(201).json({
      exists: false,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getUnconvertedLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ isConverted: false })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: leads.length,
      data: leads,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = { createLead, getUnconvertedLeads };