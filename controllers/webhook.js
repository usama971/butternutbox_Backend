// exports.stripeWebhook = async (req, res) => {
//   const sig = req.headers["stripe-signature"];

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // ✅ Payment success
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;

//     const checkout = await CheckoutSession.findOne({
//       sessionId: session.id
//     });

//     if (!checkout) return res.status(404).end();

//     if (checkout.paymentStatus === "paid") return res.json({ received: true });

//     const { pupParent, dogOrders } = checkout.payload;

//     const dbSession = await mongoose.startSession();
//     dbSession.startTransaction();

//     try {
//       // 1️⃣ Create User
//       const user = await User.create([pupParent], { session: dbSession });

//       const userId = user[0]._id;

//       // 2️⃣ Create Pets & Orders
//       for (const dog of dogOrders) {
//         const { order, ...petData } = dog;

//         const pet = await Pet.create(
//           [{ ...petData, userId }],
//           { session: dbSession }
//         );

//         await Order.create(
//           [{
//             userId,
//             petId: pet[0]._id,
//             orderItems: order.orderItems,
//             starterBox: order.starterBox,
//             totalAmount: order.totalAmount,
//             paymentIntentId: session.payment_intent,
//             subscriptionId: session.subscription
//           }],
//           { session: dbSession }
//         );
//       }

//       checkout.paymentStatus = "paid";
//       await checkout.save();

//       await dbSession.commitTransaction();
//       dbSession.endSession();

//     } catch (err) {
//       await dbSession.abortTransaction();
//       dbSession.endSession();
//       throw err;
//     }
//   }

//   res.json({ received: true });
// };
