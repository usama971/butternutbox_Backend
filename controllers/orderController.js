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
const {
  createUserNotification,
  createAdminNotifications,
} = require("../services/notificationService");

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
    // const orders = await Order.find()
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

    await Promise.all([
      createUserNotification({
        userId: order.userId,
        title: "Order cancelled",
        message: `Your order ${order.orderID} has been cancelled.`,
        type: "order_cancelled",
        orderId: order._id,
      }),
      createAdminNotifications({
        title: "Order cancelled by user",
        message: `User ${user.email} cancelled order ${order.orderID}.`,
        type: "order_cancelled_by_user",
        orderId: order._id,
        metadata: { userId: user._id, userEmail: user.email },
      }),
    ]);

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
    await createUserNotification({
      userId: order.userId,
      title: "Return request submitted",
      message: `Return request for order ${order.orderID} has been submitted.`,
      type: "return_requested",
      orderId: order._id,
      metadata: { reason },
    });
    await createAdminNotifications({
      title: "Return request by user",
      message: `User ${user.email} requested return for order ${order.orderID}.`,
      type: "return_requested_by_user",
      orderId: order._id,
      metadata: {
        userId: user._id,
        userEmail: user.email,
        reason,
        note: note || null,
      },
    });
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
    await createUserNotification({
      userId: order.userId._id || order.userId,
      title: `Return ${status}`,
      message: `Your return request for order ${order.orderID} was ${status}.`,
      type: "return_status_update",
      orderId: order._id,
      metadata: {
        status,
        rejectionReason: rejectionReason || null,
        rejectionNote: rejectionNote || null,
      },
    });

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
    await createUserNotification({
      userId: order.userId._id || order.userId,
      title: `Refund ${status}`,
      message: `Refund for order ${order.orderID} is now ${status}.`,
      type: "refund_update",
      orderId: order._id,
      metadata: { status, transactionId: transactionId || null },
    });

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
    console.log("Update Order Delivery Status req.body:", req.body);

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
    await createUserNotification({
      userId: order.userId._id || order.userId,
      title: "Order status updated",
      message: `Your order ${order.orderID} status is now ${status}.`,
      type: "order_status_update",
      orderId: order._id,
      metadata: { status },
    });

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

    // await sendEmail({
    //   to: [order.userId.email, process.env.ADMIN_EMAIL], // Send to both user and admin,
    //   subject: `Order ${order.orderID} - ${status.toUpperCase()}`,
    //   html: getUserOrderStatusTemplate(
    //     order.userId.name,
    //     order.orderID,
    //     status,
    //   ),
    // });
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

exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "userId",
        select: "-password -roleId -RefreshToken",
      })
      // .populate({
      //   path: "orders.petId",   // 👈 NESTED PATH
      //   model: "Pet",
      // })
      .lean();

    res.status(200).json({
      message: "All orders fetched successfully",
      totalOrders: orders.length,
      data: orders,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

exports.getRevenueAnalyticsSimple = async (req, res) => {
  try {
    const now = new Date();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenueStatuses = ["paid", "processing", "dispatched", "delivered"];

    const [analytics] = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: revenueStatuses },
        },
      },
      {
        $facet: {
          daily: [
            {
              $match: {
                createdAt: { $gte: dayStart, $lte: now },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],
          weekly: [
            {
              $match: {
                createdAt: { $gte: sevenDaysAgo, $lte: now },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],
          monthly: [
            {
              $match: {
                createdAt: { $gte: monthStart, $lte: now },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],
          total: [
            {
              $group: {
                _id: null,
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],
        },
      },
    ]);

    const dailyRevenue = analytics?.daily?.[0]?.total || 0;
    const weeklyRevenue = analytics?.weekly?.[0]?.total || 0;
    const monthlyRevenue = analytics?.monthly?.[0]?.total || 0;
    const totalRevenue = analytics?.total?.[0]?.total || 0;

    return res.status(200).json({
      message: "Revenue analytics fetched successfully",
      data: {
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        totalRevenue,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const now = new Date();

    // Only delivered orders
    const revenueStatus = "delivered";

    // ---------------- DATE RANGES ----------------

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOf4WeeksAgo = new Date();
    startOf4WeeksAgo.setDate(now.getDate() - 21);

    const startOf4MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const startOf4YearsAgo = new Date(now.getFullYear() - 3, 0, 1);

    // ---------------- AGGREGATION ----------------

    const [analytics] = await Order.aggregate([
      {
        $match: {
          orderStatus: revenueStatus,
        },
      },
      {
        $facet: {
          daily: [
            { $match: { createdAt: { $gte: todayStart, $lte: now } } },
            {
              $group: {
                _id: null,
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],

          weekly: [
            { $match: { createdAt: { $gte: startOf4WeeksAgo, $lte: now } } },
            {
              $group: {
                _id: {
                  year: { $isoWeekYear: "$createdAt" },
                  week: { $isoWeek: "$createdAt" },
                },
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],

          monthly: [
            { $match: { createdAt: { $gte: startOf4MonthsAgo, $lte: now } } },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],

          yearly: [
            { $match: { createdAt: { $gte: startOf4YearsAgo, $lte: now } } },
            {
              $group: {
                _id: { year: { $year: "$createdAt" } },
                total: { $sum: "$pricing.totalPayable" },
              },
            },
          ],
        },
      },
    ]);

    // ---------------- FORMAT FIXED 4 PERIODS ----------------

    const weeklyResult = [];
    const monthlyResult = [];
    const yearlyResult = [];

    // Weekly (Current + 3 previous)
    for (let i = 0; i < 4; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i * 7);

      const year = date.getFullYear();
      const week = getISOWeek(date);

      const found = analytics.weekly.find(
        (w) => w._id.year === year && w._id.week === week
      );

      weeklyResult.push({
        label: i === 0 ? "currentWeek" : `${i}weekAgo`,
        year,
        week,
        total: found ? found.total : 0,
      });
    }

    // Monthly
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const found = analytics.monthly.find(
        (m) => m._id.year === year && m._id.month === month
      );

      monthlyResult.push({
        label: i === 0 ? "currentMonth" : `${i}monthAgo`,
        year,
        month,
        total: found ? found.total : 0,
      });
    }

    // Yearly
    for (let i = 0; i < 4; i++) {
      const year = now.getFullYear() - i;

      const found = analytics.yearly.find(
        (y) => y._id.year === year
      );

      yearlyResult.push({
        label: i === 0 ? "currentYear" : `${i}yearAgo`,
        year,
        total: found ? found.total : 0,
      });
    }

    return res.status(200).json({
      message: "Revenue analytics fetched successfully",
      data: {
        daily: analytics?.daily?.[0]?.total || 0,
        weekly: weeklyResult,
        monthly: monthlyResult,
        yearly: yearlyResult,
      },
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};



exports.getRevenueBreakdown = async (req, res) => {
  try {
    const now = new Date();

    // ---------------- DATE RANGES ----------------
    const startOf4WeeksAgo = new Date();
    startOf4WeeksAgo.setDate(now.getDate() - 28);

    const startOf4MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const startOf4YearsAgo = new Date(now.getFullYear() - 3, 0, 1);

    // ---------------- AGGREGATION ----------------
    const [analytics] = await Order.aggregate([
      // Step 1: Only delivered orders, widest range (4 years) for index efficiency
      {
        $match: {
          orderStatus: "delivered",
          createdAt: { $gte: startOf4YearsAgo, $lte: now },
        },
      },

      // Step 2: Unwind orders array so each pet sub-order becomes its own doc
      { $unwind: "$orders" },

      // Step 3: Compute per sub-order totals for recipes, starter, extras
      {
        $addFields: {
          subRecipesTotal: {
            $sum: {
              $map: {
                input: "$orders.recipes",
                as: "r",
                in: { $multiply: ["$$r.price", "$$r.qty"] },
              },
            },
          },
          subStarterTotal: { $ifNull: ["$orders.starter.price", 0] },
          subExtrasTotal: {
            $sum: {
              $map: {
                input: "$orders.extras",
                as: "e",
                in: { $multiply: ["$$e.price", "$$e.qty"] },
              },
            },
          },
        },
      },

      // Step 4: Facet into weekly / monthly / yearly
      {
        $facet: {
          weekly: [
            { $match: { createdAt: { $gte: startOf4WeeksAgo, $lte: now } } },
            {
              $group: {
                _id: null,
                recipesTotal: { $sum: "$subRecipesTotal" },
                starterTotal: { $sum: "$subStarterTotal" },
                extrasTotal: { $sum: "$subExtrasTotal" },
              },
            },
          ],

          monthly: [
            { $match: { createdAt: { $gte: startOf4MonthsAgo, $lte: now } } },
            {
              $group: {
                _id: null,
                recipesTotal: { $sum: "$subRecipesTotal" },
                starterTotal: { $sum: "$subStarterTotal" },
                extrasTotal: { $sum: "$subExtrasTotal" },
              },
            },
          ],

          yearly: [
            {
              $group: {
                _id: null,
                recipesTotal: { $sum: "$subRecipesTotal" },
                starterTotal: { $sum: "$subStarterTotal" },
                extrasTotal: { $sum: "$subExtrasTotal" },
              },
            },
          ],
        },
      },
    ]);

    // ---------------- EXTRACT TOTALS ----------------
    const weekly  = analytics?.weekly?.[0]  || { recipesTotal: 0, starterTotal: 0, extrasTotal: 0 };
    const monthly = analytics?.monthly?.[0] || { recipesTotal: 0, starterTotal: 0, extrasTotal: 0 };
    const yearly  = analytics?.yearly?.[0]  || { recipesTotal: 0, starterTotal: 0, extrasTotal: 0 };

    return res.status(200).json({
      message: "Revenue breakdown fetched successfully",
      data: {
        // Last 4 weeks
        recipesForLastFourWeeks: weekly.recipesTotal,
        starterForLastFourWeeks: weekly.starterTotal,
        extrasForLastFourWeeks:  weekly.extrasTotal,

        // Last 4 months
        recipesForLastFourMonths: monthly.recipesTotal,
        starterForLastFourMonths: monthly.starterTotal,
        extrasForLastFourMonths:  monthly.extrasTotal,

        // Last 4 years
        recipesForLastFourYears: yearly.recipesTotal,
        starterForLastFourYears: yearly.starterTotal,
        extrasForLastFourYears:  yearly.extrasTotal,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


exports.getRevenueAnalytics1 = async (req, res) => {
  try {
    const now = new Date();

    // Helper function to get start of week (Monday)
    const getStartOfWeek = (date, weeksAgo = 0) => {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7); // ISO week Monday
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Helper function to get start of month
    const getStartOfMonth = (date, monthsAgo = 0) => {
      return new Date(date.getFullYear(), date.getMonth() - monthsAgo, 1);
    };

    // Helper function to get start of year
    const getStartOfYear = (date, yearsAgo = 0) => {
      return new Date(date.getFullYear() - yearsAgo, 0, 1);
    };

    const revenueStatuses = ["delivered"];

    // =============== AGGREGATION ===============
    const [analytics] = await Order.aggregate([
      { $match: { orderStatus: { $in: revenueStatuses } } },
      {
        $facet: {
          allOrders: [
            {
              $project: {
                createdAt: 1,
                recipesRevenue: { $sum: "$orders.recipes.price" },
                starterRevenue: "$orders.starter.price",
                extrasRevenue: { $sum: "$orders.extras.price" },
                totalRevenue: "$pricing.totalPayable",
              },
            },
          ],
        },
      },
    ]);

    const orders = analytics?.allOrders || [];

    // =============== BUILD BREAKDOWN ===============
    const buildTimeArray = (type, getStartFn) => {
      const arr = [];
      for (let i = 0; i < 4; i++) {
        const start = getStartFn(now, i);
        const end =
          type === "weekly"
            ? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
            : type === "monthly"
            ? new Date(now.getFullYear(), start.getMonth() + 1, 1)
            : type === "yearly"
            ? new Date(start.getFullYear() + 1, 0, 1)
            : new Date();

        const periodOrders = orders.filter(
          (o) => o.createdAt >= start && o.createdAt < end
        );

        const sum = periodOrders.reduce(
          (acc, o) => {
            acc.recipes += o.recipesRevenue || 0;
            acc.starter += o.starterRevenue || 0;
            acc.extras += o.extrasRevenue || 0;
            acc.total += o.totalRevenue || 0;
            return acc;
          },
          { recipes: 0, starter: 0, extras: 0, total: 0 }
        );

        arr.push(sum);
      }
      return arr;
    };

    const weekly = buildTimeArray("weekly", getStartOfWeek);
    const monthly = buildTimeArray("monthly", getStartOfMonth);
    const yearly = buildTimeArray("yearly", getStartOfYear);

    // Daily breakdown
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyOrders = orders.filter((o) => o.createdAt >= todayStart && o.createdAt <= now);
    const daily = dailyOrders.reduce(
      (acc, o) => {
        acc.recipes += o.recipesRevenue || 0;
        acc.starter += o.starterRevenue || 0;
        acc.extras += o.extrasRevenue || 0;
        acc.total += o.totalRevenue || 0;
        return acc;
      },
      { recipes: 0, starter: 0, extras: 0, total: 0 }
    );

    return res.status(200).json({
      message: "Revenue analytics fetched successfully",
      data: {
        daily,
        weekly,
        monthly,
        yearly,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getAdvancedKPIs = async (req, res) => {
  try {
    const now = new Date();

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // ===============================
    // 1️⃣ AOV CALCULATION
    // ===============================

    const aovData = await Order.aggregate([
      {
        $match: {
          orderStatus: "delivered",
          createdAt: { $gte: previousMonthStart },
        },
      },
      {
        $addFields: {
          period: {
            $cond: [
              { $gte: ["$createdAt", currentMonthStart] },
              "current",
              "previous",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$period",
          revenue: { $sum: "$pricing.totalPayable" },
          orders: { $sum: 1 },
        },
      },
    ]);

    const current = aovData.find(d => d._id === "current") || { revenue: 0, orders: 0 };
    const previous = aovData.find(d => d._id === "previous") || { revenue: 0, orders: 0 };

    const currentAOV = current.orders ? current.revenue / current.orders : 0;
    const previousAOV = previous.orders ? previous.revenue / previous.orders : 0;

    const aovPercentage = previousAOV
      ? ((currentAOV - previousAOV) / previousAOV) * 100
      : 0;

    // ===============================
    // 2️⃣ CUSTOMER RETENTION
    // ===============================

    const retentionData = await Order.aggregate([
      {
        $match: {
          orderStatus: "delivered",
          createdAt: { $gte: previousMonthStart },
        },
      },
      {
        $addFields: {
          period: {
            $cond: [
              { $gte: ["$createdAt", currentMonthStart] },
              "current",
              "previous",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$userId",
          periods: { $addToSet: "$period" },
        },
      },
    ]);

    const retainedCustomers = retentionData.filter(c =>
      c.periods.includes("current") && c.periods.includes("previous")
    ).length;

    const previousCustomers = retentionData.filter(c =>
      c.periods.includes("previous")
    ).length;

    const retentionRate = previousCustomers
      ? (retainedCustomers / previousCustomers) * 100
      : 0;

    // ===============================
    // 3️⃣ REPEAT PURCHASE RATE
    // ===============================

    const repeatData = await Order.aggregate([
      {
        $match: { orderStatus: "delivered" },
      },
      {
        $group: {
          _id: "$userId",
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const totalCustomers = repeatData.length;
    const repeatCustomers = repeatData.filter(c => c.totalOrders > 1).length;

    const repeatRate = totalCustomers
      ? (repeatCustomers / totalCustomers) * 100
      : 0;

    // ===============================
    // RESPONSE
    // ===============================

    const buildObject = (value, percentage) => ({
      value: Number(value.toFixed(2)),
      percentage: Number(percentage.toFixed(2)),
      trend:
        percentage > 0 ? "up" :
        percentage < 0 ? "down" :
        "same",
    });

    return res.status(200).json({
      message: "Advanced KPIs fetched successfully",
      data: {
        AverageOrderValue: buildObject(currentAOV, aovPercentage),
        CustomerRetention: buildObject(retentionRate, 0), // retention comparison can be expanded
        RepeatPurchaseRate: buildObject(repeatRate, 0),
      },
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Helper function for ISO week
function getISOWeek(date) {
  const temp = new Date(date);
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 4 - (temp.getDay() || 7));
  const yearStart = new Date(temp.getFullYear(), 0, 1);
  return Math.ceil(((temp - yearStart) / 86400000 + 1) / 7);
}

//  /orders/:orderId/dispute
exports.requestDispute = async (req, res) => {
  console.log("Request Dispute req.body", req.body);

  try {
    const { orderId } = req.params;
    const { reason, note, evidence } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only allow dispute for delivered or paid orders
    if (!["delivered", "paid"].includes(order.orderStatus)) {
      return res
        .status(400)
        .json({ message: "Dispute can only be requested for delivered or paid orders" });
    }

    // Prevent duplicate disputes
    if (order.dispute && order.dispute.status !== "none") {
      return res
        .status(400)
        .json({ message: "A dispute has already been requested for this order" });
    }

    // Update dispute
    order.dispute = {
      status: "requested",
      reason,
      note,
      evidence: Array.isArray(evidence) ? evidence : [],
      requestedAt: new Date(),
    };
// console.log("Updated Order with Dispute:", order);
    // order.orderStatus = "disputed"; // optional
    await order.save();
    console.log("Order saved with dispute:", order);

    res.json({ message: "Dispute requested successfully", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// PATCH request for admin to resolve a dispute
exports.resolveDispute = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body; // status = "approved" or "rejected"

    // Validate input
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Check if there is a pending dispute
    if (!order.dispute || order.dispute.status !== "requested") {
      return res.status(400).json({ message: "No pending dispute to resolve" });
    }

    // Update admin resolution
    order.dispute.adminResolution = {
      status,
      note: note || "",
      resolvedAt: new Date(),
    };

    // Update dispute status based on admin decision
    order.dispute.status = status; // approved or rejected

    // Optional: Update orderStatus based on dispute resolution
    // if (status === "approved") {
    //   order.orderStatus = "disputed"; // keep as disputed or add a new enum like 'dispute_approved'
    // } else if (status === "rejected") {
    //   order.orderStatus = "disputed"; // or 'dispute_rejected' if you want separate enum
    // }

    await order.save();

    res.json({ message: `Dispute ${status}`, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
