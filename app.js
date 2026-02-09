const express = require("express");
const connectDB = require("./db");
var cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
// Import routes
const roleRoutes = require("./routes/roleRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const userRoutes = require("./routes/userRoutes");
const petRoutes = require("./routes/petRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const recipeRoutesForUser = require("./routes/recipeRoutesForUser");
const orderRoutes = require("./routes/orderRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const promoCodeRoutes = require("./routes/promoCodeRoutes");
const promoCodeValidateRoutes = require("./routes/promoCodeValidateRoutes");
const checkoutRoutes = require("./routes/checkout");
const authRoutes = require("./routes/authRoutes");
const authenticateJWT = require("./controllers/middlewares/authenticateJWT");
// abc
const app = express();
app.use(cors());

app.use("/api/stripe", require("./routes/webhook"));

// app.use(
//   "/api/stripe/webhook",
//   express.raw({ type: "application/json" })
// );

app.use(express.json());

// Connect DB
connectDB();

app.get("/api/Check", (req, res) => {
  console.log("butter nut box connected");
  res.send("connected with butter nut box");
});



// Routes
app.use("/api/auth", authRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/promoCodes/validate", promoCodeValidateRoutes);

app.use("/api/recipes", recipeRoutesForUser);

app.use("/api", authenticateJWT);
app.use("/api/recipes", recipeRoutes);

app.use("/api/roles", roleRoutes);
app.use("/api/admins", superAdminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/shippings", shippingRoutes);
app.use("/api/promoCodes", promoCodeRoutes);

// app.listen(7001, () => console.log("Server running on http://localhost:7001"));
const PORT = process.env.PORT || 7002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
