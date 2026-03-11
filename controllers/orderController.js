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
const userController = require("./userController");
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

    // 5️⃣ Update order with cancel reason & note + push to orderStatusHistory
    const cancelledAt = new Date();
    const statusEntry = { status: "cancelled", updatedAt: cancelledAt };

    await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          orderStatus: "cancelled",
          cancelReason,
          cancelNote: cancelNote || null,
          cancelledAt,
          refund: {
            status: "processing",
            amount: order.pricing?.totalPayable || 0,
            requestedAt: cancelledAt,
          },
        },
        $push: { orderStatusHistory: statusEntry },
      },
      { new: true }
    );

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
        error: "Cannot update a completed order.",
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

    const statusEntry = { status, updatedAt: new Date() };
    const updatePayload = {
      $set: { orderStatus: status },
      $push: { orderStatusHistory: statusEntry },
    };

    if (status === "delivered") {
      updatePayload.$set.deliveredDate = new Date();
    }

    await Order.findByIdAndUpdate(order._id, updatePayload, { new: true });
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
      orderStatus: status,
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
      .populate({
        path: "orders.petId",   // 👈 NESTED PATH
        model: "Pet",
      })
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

const getRevenueAnalytics = async (req, res) => {
  try {
    const now = new Date();

    // Only delivered orders
    const revenueStatus = "delivered";

    // ---------------- DATE RANGES ----------------

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOf4WeeksAgo = new Date();
    startOf4WeeksAgo.setDate(now.getDate() - 28);

    const startOf4MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const startOf4YearsAgo = new Date(now.getFullYear() - 3, 0, 1);

    // ---------------- AGGREGATION ----------------

    const [analytics] = await Order.aggregate([
      {
        $match: {
          orderStatus: revenueStatus,
          "dispute.status": {
            $nin: ["requested", "under_review", "resolved", "rejected"],
          },
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

    // Weekly (Current + 3 previous) — use ISO week year to match MongoDB $isoWeekYear
    for (let i = 0; i < 4; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i * 7);

      const year = getISOWeekYear(date);
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



const getRevenueBreakdown = async (req, res) => {
  try {
    const now = new Date();

    // ---------------- DATE RANGES ----------------
    const startOf4WeeksAgo = new Date();
    startOf4WeeksAgo.setDate(now.getDate() - 28);

    const startOf4MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const startOf4YearsAgo = new Date(now.getFullYear() - 3, 0, 1);

    // ---------------- AGGREGATION ----------------
    const [analytics] = await Order.aggregate([
      // Step 1: Only delivered orders, exclude disputed orders, widest range (4 years)
      {
        $match: {
          orderStatus: "delivered",
          createdAt: { $gte: startOf4YearsAgo, $lte: now },
          "dispute.status": {
            $nin: ["requested", "under_review", "resolved", "rejected"],
          },
        },
      },

      // Step 2: Unwind orders array so each pet sub-order becomes its own doc
      { $unwind: "$orders" },

      // Step 3: Compute per sub-order totals for recipes, starter, extras (null-safe)
      {
        $addFields: {
          subRecipesTotal: {
            $sum: {
              $map: {
                input: { $ifNull: ["$orders.recipes", []] },
                as: "r",
                in: {
                  $multiply: [
                    "$$r.price",
                    { $ifNull: ["$$r.qty", 1] },
                  ],
                },
              },
            },
          },
          subStarterTotal: { $ifNull: ["$orders.starter.price", 0] },
          subExtrasTotal: {
            $sum: {
              $map: {
                input: { $ifNull: ["$orders.extras", []] },
                as: "e",
                in: {
                  $multiply: [
                    "$$e.price",
                    { $ifNull: ["$$e.qty", 1] },
                  ],
                },
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

const getAdvancedKPIs = async (req, res) => {
  try {
    const now = new Date();

    const disputeExclude = {
      "dispute.status": { $nin: ["requested", "under_review", "resolved", "rejected"] },
    };

    const baseMatch = { orderStatus: "delivered", ...disputeExclude };

    // ---------- DATE RANGES ----------
    // Weeks: last 4 weeks (0–28 days), previous 4 weeks (28–56 days), before that (56–84 days)
    const w0 = new Date(now); w0.setDate(now.getDate() - 28);
    const w1 = new Date(now); w1.setDate(now.getDate() - 56);
    const w2 = new Date(now); w2.setDate(now.getDate() - 84);

    // Months: last 4 months, previous 4 months, before that
    const m0 = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    const m1 = new Date(now.getFullYear(), now.getMonth() - 8, 1);
    const m2 = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    // Years: last 4 years, previous 4 years, before that
    const y0 = new Date(now.getFullYear() - 4, 0, 1);
    const y1 = new Date(now.getFullYear() - 8, 0, 1);
    const y2 = new Date(now.getFullYear() - 12, 0, 1);

    const calcPct = (curr, prev) =>
      prev ? Number((((curr - prev) / prev) * 100).toFixed(2)) : 0;

    const buildKpi = (value, pct) => ({
      value: Number(value.toFixed(2)),
      percentageChange: pct,
      trend: pct > 0 ? "up" : pct < 0 ? "down" : "same",
    });

    // ---------- AOV PIPELINE ----------
    const aovPipeline = (start, end) => [
      { $match: { ...baseMatch, createdAt: { $gte: start, $lte: end || now } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$pricing.totalPayable" },
          orders: { $sum: 1 },
        },
      },
    ];

    const [aovW0, aovW1, aovW2] = await Promise.all([
      Order.aggregate(aovPipeline(w0, now)),
      Order.aggregate(aovPipeline(w1, w0)),
      Order.aggregate(aovPipeline(w2, w1)),
    ]);
    const [aovM0, aovM1, aovM2] = await Promise.all([
      Order.aggregate(aovPipeline(m0, now)),
      Order.aggregate(aovPipeline(m1, m0)),
      Order.aggregate(aovPipeline(m2, m1)),
    ]);
    const [aovY0, aovY1, aovY2] = await Promise.all([
      Order.aggregate(aovPipeline(y0, now)),
      Order.aggregate(aovPipeline(y1, y0)),
      Order.aggregate(aovPipeline(y2, y1)),
    ]);

    const getAov = (r) => (r[0]?.orders ? r[0].revenue / r[0].orders : 0);
    const aovW0Val = getAov(aovW0); const aovW1Val = getAov(aovW1); const aovW2Val = getAov(aovW2);
    const aovM0Val = getAov(aovM0); const aovM1Val = getAov(aovM1); const aovM2Val = getAov(aovM2);
    const aovY0Val = getAov(aovY0); const aovY1Val = getAov(aovY1); const aovY2Val = getAov(aovY2);

    // ---------- RETENTION: % of previous-period customers who also bought in current period ----------
    const retentionPipeline = (currStart, currEnd, prevStart, prevEnd) => [
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: prevStart, $lte: currEnd || now },
        },
      },
      {
        $addFields: {
          inCurrent: { $and: [{ $gte: ["$createdAt", currStart] }, { $lte: ["$createdAt", currEnd || now] }] },
          inPrevious: { $and: [{ $gte: ["$createdAt", prevStart] }, { $lte: ["$createdAt", prevEnd] }] },
        },
      },
      { $match: { $or: [{ inCurrent: true }, { inPrevious: true }] } },
      {
        $group: {
          _id: "$userId",
          inCurrent: { $max: { $cond: ["$inCurrent", 1, 0] } },
          inPrevious: { $max: { $cond: ["$inPrevious", 1, 0] } },
        },
      },
      {
        $group: {
          _id: null,
          retained: { $sum: { $cond: [{ $and: ["$inCurrent", "$inPrevious"] }, 1, 0] } },
          prevCustomers: { $sum: "$inPrevious" },
        },
      },
    ];

    const [retW0, retW1] = await Promise.all([
      Order.aggregate(retentionPipeline(w0, now, w1, w0)),
      Order.aggregate(retentionPipeline(w1, w0, w2, w1)),
    ]);
    const [retM0, retM1] = await Promise.all([
      Order.aggregate(retentionPipeline(m0, now, m1, m0)),
      Order.aggregate(retentionPipeline(m1, m0, m2, m1)),
    ]);
    const [retY0, retY1] = await Promise.all([
      Order.aggregate(retentionPipeline(y0, now, y1, y0)),
      Order.aggregate(retentionPipeline(y1, y0, y2, y1)),
    ]);

    const getRetention = (r) => {
      const prev = r[0]?.prevCustomers || 0;
      return prev ? ((r[0]?.retained || 0) / prev) * 100 : 0;
    };

    // ---------- REPEAT RATE: % of customers with 2+ orders in period ----------
    const repeatPipeline = (start, end) => [
      { $match: { ...baseMatch, createdAt: { $gte: start, $lte: end || now } } },
      { $group: { _id: "$userId", orderCount: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          repeat: { $sum: { $cond: [{ $gte: ["$orderCount", 2] }, 1, 0] } },
        },
      },
    ];

    const [repW0, repW1] = await Promise.all([
      Order.aggregate(repeatPipeline(w0, now)),
      Order.aggregate(repeatPipeline(w1, w0)),
    ]);
    const [repM0, repM1] = await Promise.all([
      Order.aggregate(repeatPipeline(m0, now)),
      Order.aggregate(repeatPipeline(m1, m0)),
    ]);
    const [repY0, repY1] = await Promise.all([
      Order.aggregate(repeatPipeline(y0, now)),
      Order.aggregate(repeatPipeline(y1, y0)),
    ]);

    const getRepeat = (r) => {
      const total = r[0]?.total || 0;
      return total ? ((r[0]?.repeat || 0) / total) * 100 : 0;
    };

    const repW0Val = getRepeat(repW0); const repW1Val = getRepeat(repW1);
    const repM0Val = getRepeat(repM0); const repM1Val = getRepeat(repM1);
    const repY0Val = getRepeat(repY0); const repY1Val = getRepeat(repY1);

    // ---------- BUILD RESPONSE ----------
    return res.status(200).json({
      message: "Advanced KPIs fetched successfully",
      data: {
        AverageOrderValue: {
          last4Weeks: buildKpi(aovW0Val, calcPct(aovW0Val, aovW1Val)),
          last4Months: buildKpi(aovM0Val, calcPct(aovM0Val, aovM1Val)),
          last4Years: buildKpi(aovY0Val, calcPct(aovY0Val, aovY1Val)),
        },
        CustomerRetention: {
          last4Weeks: buildKpi(getRetention(retW0), calcPct(getRetention(retW0), getRetention(retW1))),
          last4Months: buildKpi(getRetention(retM0), calcPct(getRetention(retM0), getRetention(retM1))),
          last4Years: buildKpi(getRetention(retY0), calcPct(getRetention(retY0), getRetention(retY1))),
        },
        RepeatPurchaseRate: {
          last4Weeks: buildKpi(repW0Val, calcPct(repW0Val, repW1Val)),
          last4Months: buildKpi(repM0Val, calcPct(repM0Val, repM1Val)),
          last4Years: buildKpi(repY0Val, calcPct(repY0Val, repY1Val)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};



/**
 * Runs a controller handler and captures the JSON it would send (for combining responses).
 */
async function captureHandlerResponse(handler, req) {
  return new Promise((resolve, reject) => {
    const mockRes = {
      status: function () { return this; },
      json: (data) => resolve(data),
    };
    handler(req, mockRes).catch(reject);
  });
}

exports.getDashboardCombined = async (req, res) => {
  try {
    const [usersMonthlyByWeek, orderStatusCounts, dashboardStats] = await Promise.all([
      captureHandlerResponse(userController.getUsersMonthlyByWeek, req),
      captureHandlerResponse(exports.getOrderStatusCounts, req),
      captureHandlerResponse(exports.getDashboardStats, req),
    ]);

    return res.status(200).json({
      message: "Dashboard data fetched successfully",
      data: {
        usersMonthlyByWeek: usersMonthlyByWeek.data,
        orderStatusCounts: orderStatusCounts.data,
        dashboardStats: dashboardStats.data,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getOrderStatusCounts = async (req, res) => {
  try {
    const [totalOrders, cancelled, delivered, disputed] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: "cancelled" }),
      Order.countDocuments({ orderStatus: "delivered" }),
      Order.countDocuments({ "dispute.adminResolution.status": { $in: ["approved", "rejected"] } }),
    ]);

    res.status(200).json({
      message: "Order status counts fetched successfully",
      data: {
        totalOrders,
        cancelled,
        delivered,
        disputed,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const revenueStatuses = ["paid", "processing", "dispatched", "delivered"];
    const now = new Date();
    const periodDays = 30;
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - periodDays);
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const [
      totalUsers,
      totalOrders,
      totalRevenueResult,
      currentUsers,
      previousUsers,
      currentOrders,
      previousOrders,
      currentRevenue,
      previousRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments({ orderStatus: { $in: revenueStatuses } }),
      Order.aggregate([
        { $match: { orderStatus: { $in: revenueStatuses } } },
        { $group: { _id: null, total: { $sum: "$pricing.totalPayable" } } },
      ]),
      User.countDocuments({ createdAt: { $gte: currentStart } }),
      User.countDocuments({ createdAt: { $gte: previousStart, $lt: currentStart } }),
      Order.countDocuments({ orderStatus: { $in: revenueStatuses }, createdAt: { $gte: currentStart } }),
      Order.countDocuments({ orderStatus: { $in: revenueStatuses }, createdAt: { $gte: previousStart, $lt: currentStart } }),
      Order.aggregate([
        { $match: { orderStatus: { $in: revenueStatuses }, createdAt: { $gte: currentStart } } },
        { $group: { _id: null, total: { $sum: "$pricing.totalPayable" } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $in: revenueStatuses }, createdAt: { $gte: previousStart, $lt: currentStart } } },
        { $group: { _id: null, total: { $sum: "$pricing.totalPayable" } } },
      ]),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total ?? 0;
    const currRev = currentRevenue[0]?.total ?? 0;
    const prevRev = previousRevenue[0]?.total ?? 0;

    const pctChange = (curr, prev) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10;

    res.status(200).json({
      message: "Dashboard stats fetched successfully",
      data: {
        totalUsers: {
          value: totalUsers,
          percentageChange: pctChange(currentUsers, previousUsers),
          trend: currentUsers >= previousUsers ? "up" : "down",
        },
        totalOrders: {
          value: totalOrders,
          percentageChange: pctChange(currentOrders, previousOrders),
          trend: currentOrders >= previousOrders ? "up" : "down",
        },
        totalRevenue: {
          value: totalRevenue,
          percentageChange: pctChange(currRev, prevRev),
          trend: currRev >= prevRev ? "up" : "down",
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnalyticsCombined = async (req, res) => {
  try {
    const [revenueAnalytics, revenueBreakdown, advancedKPIs] = await Promise.all([
      captureHandlerResponse(getRevenueAnalytics, req),
      captureHandlerResponse(getRevenueBreakdown, req),
      captureHandlerResponse(getAdvancedKPIs, req),
    ]);

    return res.status(200).json({
      message: "Analytics fetched successfully",
      data: {
        revenueAnalytics,
        revenueBreakdown,
        advancedKPIs,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Helper: ISO week number (1–53), matches MongoDB $isoWeek
function getISOWeek(date) {
  const temp = new Date(date);
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 4 - (temp.getDay() || 7));
  const yearStart = new Date(temp.getFullYear(), 0, 1);
  return Math.ceil(((temp - yearStart) / 86400000 + 1) / 7);
}

// Helper: ISO week year (can differ from calendar year at boundaries), matches MongoDB $isoWeekYear
function getISOWeekYear(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return d.getFullYear();
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

exports.getUsersMonthlyByWeek = async (req, res) => {
  try {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();

    const getWeekRanges = (year, month) => {
      const weeks = [];
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const numDays = last.getDate();
      let weekNum = 1;
      for (let day = 1; day <= numDays; day += 7) {
        const weekStart = new Date(year, month, day, 0, 0, 0, 0);
        const weekEndDay = Math.min(day + 7, numDays + 1);
        const weekEnd = new Date(year, month, weekEndDay, 0, 0, 0, 0);
        weeks.push({
          week: weekNum,
          weekLabel: `Week ${weekNum}`,
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          start: weekStart,
          end: weekEnd,
        });
        weekNum++;
      }
      return weeks;
    };

    const currWeeks = getWeekRanges(currYear, currMonth);
    const prevYear = currMonth === 0 ? currYear - 1 : currYear;
    const prevMonth = currMonth === 0 ? 11 : currMonth - 1;
    const prevWeeks = getWeekRanges(prevYear, prevMonth);

    const countForWeek = async (start, end) => {
      return User.countDocuments({
        createdAt: { $gte: start, $lt: end },
      });
    };

    const currentMonth = await Promise.all(
      currWeeks.map(async (w) => ({
        week: w.week,
        weekLabel: w.weekLabel,
        startDate: w.startDate,
        endDate: w.endDate,
        count: await countForWeek(w.start, w.end),
      }))
    );

    const previousMonth = await Promise.all(
      prevWeeks.map(async (w) => ({
        week: w.week,
        weekLabel: w.weekLabel,
        startDate: w.startDate,
        endDate: w.endDate,
        count: await countForWeek(w.start, w.end),
      }))
    );

    res.status(200).json({
      message: "Users by month (week-wise) fetched successfully",
      data: {
        currentMonth: {
          year: currYear,
          month: currMonth + 1,
          monthLabel: new Date(currYear, currMonth).toLocaleString("default", { month: "long" }),
          weeks: currentMonth,
        },
        previousMonth: {
          year: prevYear,
          month: prevMonth + 1,
          monthLabel: new Date(prevYear, prevMonth).toLocaleString("default", { month: "long" }),
          weeks: previousMonth,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

