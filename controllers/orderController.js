const mongoose = require("mongoose");
const Order = require("../Models/order");
const Pet = require("../Models/pet1");
const User = require("../Models/userModel");

const Feedback = require("../Models/feedback");

const orderValidation = require("../validation/orderValidation");
const petValidation = require("../validation/petValidation");
const userValidation = require("../validation/userValidation");

exports.createOrder = async (req, res) => {
  try {
    const { error } = orderValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ message: "Order created", data: order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.getOrders = async (req, res) => {
//   try {
//     const orders = await Order.find().populate('userId orderItems.productId');
//     res.json({ message: 'Orders fetched', data: orders });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getOrders = async (req, res) => {
  try {
    let userId = req.user.userId;
    console.log("Fetching orders for userId:", userId);
    // 1️⃣ Fetch all orders
    const orders = await Order.find({ userId: userId })
      // .populate("userId") 
      .populate("petId")
      .lean(); // 👈 important for performance & mutation

    console.log("Fetched Orders:", orders);
    // 2️⃣ Get all order IDs
    const orderIds = orders.map((order) => order._id);

    // 3️⃣ Fetch only relevant feedbacks
    const feedbacks = await Feedback.find({
      orderId: { $in: orderIds },
    }).lean();

    // 4️⃣ Map feedbacks by orderId for O(1) access
    const feedbackMap = {};
    feedbacks.forEach((fb) => {
      feedbackMap[fb.orderId.toString()] = fb;
    });

    // 5️⃣ Attach feedback to each order
    const ordersWithFeedback = orders.map((order) => ({
      ...order,
      feedback: feedbackMap[order._id.toString()] || null,
    }));

    // console.log("Orders with Feedback:", ordersWithFeedback[5].feedback);
    console.log(
      "Orders with Feedback:",
      ordersWithFeedback.map((o) => o.feedback)
    );
    res.json({
      message: "Orders fetched",
      data: ordersWithFeedback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPetOrder = async (req, res) => {
  console.log("Received request body:", req.body);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { pupParent, dogOrders } = req.body;

    // ---------------- 1️⃣ Validate User ----------------
    const { error: userError } = userValidation.validate(pupParent);
    if (userError) throw new Error(userError.details[0].message);

    if (!pupParent.roleId) {
      pupParent.roleId = "644f5b2f4a3f4b6d6c8e4b1a"; // CLIENT ROLE
    }

    // ---------------- 2️⃣ Check if User Already Exists ----------------
    const existingUser = await User.findOne({ email: pupParent.email }).session(
      session
    );
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(409)
        .json({ message: "User already exists", user: existingUser.email });
    }

    // ---------------- 3️⃣ Create User ----------------
    const [createdUser] = await User.create([pupParent], { session });
    const user = createdUser;
    const userId = user._id;
    const userIdStr = userId.toString();

    // ---------------- 4️⃣ Validate dogOrders ----------------
    if (!Array.isArray(dogOrders) || dogOrders.length === 0) {
      throw new Error("dogOrders array is required");
    }

    const pets = [];
    const orders = [];

    // ---------------- 5️⃣ Process Each Dog + Order ----------------
    for (let i = 0; i < dogOrders.length; i++) {
      const dogData = dogOrders[i];
      const { order, ...petData } = dogData;

      // ---- Validate Pet (Joi uses STRING id)
      const { error: petError } = petValidation.validate({
        ...petData,
        userId: userIdStr,
      });

      if (petError) {
        throw new Error(`Dog ${i + 1}: ${petError.details[0].message}`);
      }

      // ---- Check if Dog Already Exists ----------------
      const existingPet = await Pet.findOne({
        userId,
        name: petData.name,
        breed: petData.breed,
      }).session(session);
      console.log(
        "Existing Pet Check:",
        existingPet,
        petData.name,
        petData.breed
      );
      if (existingPet) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          message: `Dog "${petData.name}" with breed "${petData.breed}" already exists for this user`,
        });
      }

      // ---- Create New Dog ----------------
      const [createdPet] = await Pet.create([{ ...petData, userId }], {
        session,
      });
      const pet = createdPet;
      pets.push(pet);

      // ---- Validate Order ----------------
      const { error: orderError } = orderValidation.validate({
        orderItems: order.orderItems,
        totalAmount: order.totalAmount,
        starterBox: order.starterBox,
        userId: userIdStr,
        petId: pet._id.toString(),
      });

      if (orderError) {
        throw new Error(`Order ${i + 1}: ${orderError.details[0].message}`);
      }

      orders.push({
        orderItems: order.orderItems,
        totalAmount: order.totalAmount,
        starterBox: order.starterBox,
        userId,
        petId: pet._id,
      });
    }

    // ---------------- 6️⃣ Insert Orders ----------------
    const createdOrders = await Order.insertMany(orders, { session });

    // ---------------- 7️⃣ Commit ----------------
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "User, dogs and orders created successfully",
      user,
      pets,
      orders: createdOrders,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
