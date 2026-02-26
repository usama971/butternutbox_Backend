/**
 * One-time migration: Update promo codes with status "expire" to "inactive"
 * Run: node scripts/migrate-promo-status.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const PromoCode = require("../Models/promoCode");
const connectDB = require("../db");

async function migrate() {
  await connectDB();
  const result = await PromoCode.updateMany(
    { status: "expire" },
    { $set: { status: "inactive" } }
  );
  console.log(`Migrated ${result.modifiedCount} promo code(s) from "expire" to "inactive"`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
