const mongoose = require("mongoose");
const Order = require("../Models/order");
const Pet = require("../Models/pet1");
const User = require("../Models/userModel");

const Feedback = require("../Models/feedback");

const orderValidation = require("../validation/orderValidation");
const petValidation = require("../validation/petValidation");
const userValidation = require("../validation/userValidation");

const Subscription = require("../Models/subscription");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { cancelOrderValidation } = require("../validation/orderValidation");

const sendEmail = require("../services/emailService");
const {
  getUserCancelTemplate,
  getAdminCancelTemplate,
  getUserReturnRequestTemplate,
  getAdminReturnRequestTemplate,
  getUserRefundCompletedTemplate,
  getUserRefundRejectedTemplate,
  getUserReturnApprovedTemplate,
  getUserReturnRejectedTemplate,
  getUserOrderStatusTemplate,
} = require("../utils/emailTemplates");

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
    // const orders = await Order.find({ userId: userId })
    const orders = await Order.find({ userId: userId })
      .populate("userId")
      .select("-password -roleId")
      .populate({
        path: "orders.petId",
        model: "Pet", // 👈 must match your Pet model name
      })
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
    // console.log(
    //   "Orders with Feedback:",
    //   ordersWithFeedback.map((o) => o.feedback),
    // );
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
      session,
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
        petData.breed,
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

exports.cancelOrder = async (req, res) => {
  try {
    // console.log("Cancel Order req.params:", req.params);
    console.log("Cancel Order req.body:", req.body);
    console.log("Cancel Order userId from token:", req.user);
    const user = await User.findById(req.user.userId);
    console.log("Cancel Order user from DB:", user);
    // 1️⃣ Validate request body
    const { error, value } = cancelOrderValidation.validate({ ...req.body });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { orderId, cancelReason, cancelNote } = value;

    // 2️⃣ Find order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // 3️⃣ Only processing or paid orders can be cancelled
    if (order.orderStatus !== "processing" && order.orderStatus !== "paid") {
      return res.status(400).json({
        error: `Cannot cancel order because its status is "${order.orderStatus}". Only processing or paid orders can be cancelled.`,
      });
    }

    // 4️⃣ Cancel subscription if exists
    const subscription = await Subscription.findOne({ orderId });
    if (subscription?.stripeSubscriptionId) {
      // await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      subscription.status = "cancelled";
      subscription.autoRenew = false;
      await subscription.save();
    }

    // 5️⃣ Update order with cancel reason & note
    order.orderStatus = "cancelled";
    order.cancelReason = cancelReason;
    order.cancelNote = cancelNote || null;
    order.cancelledAt = new Date();
    // 🔥 Automatically trigger refund request
    order.refund = {
      status: "processing",
      amount: order.pricing?.totalPayable || 0,
      requestedAt: new Date(),
    };
    await order.save();

    // Send email to user
    await sendEmail({
      to: [user.email, process.env.ADMIN_EMAIL], // Send to both user and admin
      // to: user.email,
      subject: "Order Cancellation Confirmation",
      html: getUserCancelTemplate(
        // order.userId.name,
        user.name,
        order.orderID,
        cancelReason,
        cancelNote,
      ),
    });

    // Send email to admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "User Cancelled an Order",
      html: getAdminCancelTemplate(
        user.name,
        user.email,
        order.orderID,
        cancelReason,
        cancelNote,
      ),
    });

    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestReturn = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    const { orderId, reason, note } = req.body;

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only delivered orders can be returned
    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        error: "Return can only be requested for delivered orders.",
      });
    }

    // Prevent duplicate request
    if (order.return.status !== "none") {
      return res.status(400).json({
        error: "Return already requested or processed.",
      });
    }

    order.return = {
      status: "requested",
      reason,
      note: note || null,
      requestedAt: new Date(),
    };

    await order.save();
    await sendEmail({
      // to: user.email,
      to: [user.email, process.env.ADMIN_EMAIL], // Send to both user and admin

      subject: "Return Request Received",
      html: getUserReturnRequestTemplate(
        user.name,
        order.orderID,
        reason,
        note,
      ),
    });
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "New Return Request Submitted",
      html: getAdminReturnRequestTemplate(
        user.name,
        user.email,
        order.orderID,
        reason,
        note,
      ),
    });

    res.status(200).json({
      message: "Return request submitted successfully.",
      data: order.return,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// below functions are for Admin

exports.updateReturnStatus = async (req, res) => {
  try {
    const { orderId, status, rejectionReason, rejectionNote } = req.body;
    console.log("Update Return Status req.body:", req.body);

    const order = await Order.findById(orderId).populate("userId");

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.return.status !== "requested") {
      return res.status(400).json({
        error: "No pending return request found.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be approved or rejected.",
      });
    }

    // 🔥 Update return status
    order.return.status = status;
    order.return.processedAt = new Date();

    if (status === "rejected") {
      order.return.rejectionReason = rejectionReason || null;
      order.return.rejectionNote = rejectionNote || null;
      order.refund = {
        status: "rejected",
        amount: 0,
        processedAt: new Date(),
      };
    }

    // 🔥 If approved → trigger refund request
    if (status === "approved") {
      order.refund = {
        status: "processing",
        amount: order.pricing?.totalPayable || 0,
        requestedAt: new Date(),
      };
    }

    await order.save();

    // =========================
    // 📩 Send Email to User
    // =========================

    if (status === "approved") {
      await sendEmail({
        to: [order.userId.email, process.env.ADMIN_EMAIL], // Send to both user and admin
        subject: "Return Request Approved",
        html: getUserReturnApprovedTemplate(order.userId.name, order.orderID),
      });
    }

    if (status === "rejected") {
      await sendEmail({
        to: [order.userId.email, process.env.ADMIN_EMAIL], // Send to both user and admin
        subject: "Return Request Update",
        html: getUserReturnRejectedTemplate(
          order.userId.name,
          order.orderID,
          rejectionReason,
          rejectionNote,
        ),
      });
    }

    res.status(200).json({
      message: `Return ${status} successfully.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRefundStatus = async (req, res) => {
  try {
    const { orderId, status, transactionId } = req.body;

    const order = await Order.findById(orderId).populate("userId");

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.refund.status === "none") {
      return res.status(400).json({
        error: "No refund request found for this order.",
      });
    }

    const allowedStatuses = ["processing", "completed", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid refund status.",
      });
    }

    // 🔥 Prevent double completion
    if (order.refund.status === "completed") {
      return res.status(400).json({
        error: "Refund already completed.",
      });
    }

    order.refund.status = status;

    if (status === "completed") {
      order.refund.transactionId = transactionId || null;
      order.refund.processedAt = new Date();
    }

    await order.save();

    // Optional: Send email to user when refund completed
    if (status === "completed") {
      await sendEmail({
        to: [order.userId.email, process.env.ADMIN_EMAIL], // Send to both user and admin
        subject: "Refund Completed",
        html: getUserRefundCompletedTemplate(
          order.userId.name,
          order.orderID,
          order.refund.amount,
          transactionId,
        ),
      });
    }

    res.status(200).json({
      message: `Refund marked as ${status}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderDeliveryStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const allowedStatuses = ["processing", "dispatched", "delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status update.",
      });
    }

    const order = await Order.findById(orderId).populate("userId");

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        error: "Cannot update a cancelled order.",
      });
    }

    if (order.refund?.status === "completed") {
      return res.status(400).json({
        error: "Cannot update a refunded order.",
      });
    }

    // ----- VALID TRANSITIONS -----

    if (status === "processing" && order.orderStatus !== "paid") {
      return res.status(400).json({
        error: "Only paid orders can move to processing.",
      });
    }

    if (status === "dispatched" && order.orderStatus !== "processing") {
      return res.status(400).json({
        error: "Only processing orders can be dispatched.",
      });
    }

    if (status === "delivered" && order.orderStatus !== "dispatched") {
      return res.status(400).json({
        error: "Only dispatched orders can be delivered.",
      });
    }

    if (status === "delivered") {
      order.deliveredDate = new Date();
    }

    order.orderStatus = status;
    await order.save();

    // ✅ SEND EMAIL AUTOMATICALLY
    // await sendEmail({
    //   to: order.userId.email,
    //   subject: `Order ${order.orderID} - ${status.toUpperCase()}`,
    //   html: getOrderStatusEmailTemplate(
    //     order.userId.name,
    //     order.orderID,
    //     status,
    //   ),
    // });

    await sendEmail({
      to: [order.userId.email, process.env.ADMIN_EMAIL], // Send to both user and admin,
      subject: `Order ${order.orderID} - ${status.toUpperCase()}`,
      html: getUserOrderStatusTemplate(
        order.userId.name,
        order.orderID,
        status,
      ),
    });
    return res.status(200).json({
      message: `Order updated to ${status}.`,
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};
