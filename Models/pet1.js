const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  gender: { type: String },
  behavior: { type: String },
  food: { type: [String], default: [] },
  behaviorFussy: { type: String },
  importantFood: { type: String },
  bodyType: { type: String },
  weight: { type: Number },
  activity: { type: String },
  fussyEater: { type: String },
  importantFoodItem: { type: String },
  bodyCondition: { type: String },
  activityLevel: { type: String },
  allergies: { type: [String], default: [] },
  healthIssues: { type: [String], default: [] },
  snacks: { type: Array },
  selectedHealthIssues: { type: Array },
  breed: { type: String },
  ageGroup: { type: String },
  age: { type: Number },
  month: { type: Number },
  week: { type: Number },
  year: { type: Number },
  workingDog: { type: Boolean, default: false },
  guess: { type: Boolean, default: false },
  notBroughtHomeYet: { type: Boolean, default: false },
  dontKnowBreed: { type: Boolean, default: false },
  health: { type: String },
  healthCondition: { type: String },
}, { timestamps: true });


// ✅ UNIQUE DOG PER USER (name-based)
PetSchema.index(
  { userId: 1, name: 1 },
  { unique: true }
);
module.exports = mongoose.model('Pet', PetSchema);
