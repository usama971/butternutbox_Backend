const mongoose = require("mongoose");
const User = require("../Models/userModel");
const UserDogs = require("../Models/pet");
const { userValidation } = require("../validation/userValidation");
const { dogValidation } = require("../validation/petValidation");


exports.registerWithDogs = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { pupParent, dogs, order } = req.body;

    // ---------------- Joi Validations ----------------

    // validate user
    const userCheck = userValidation.validate(pupParent);
    if (userCheck.error) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: userCheck.error.details[0].message });
    }

    // validate each dog
    for (let dog of dogs) {
      const dogCheck = dogValidation.validate(dog);
      if (dogCheck.error) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: dogCheck.error.details[0].message });
      }
    }

    if (dogs.length > 2) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "You can add a maximum of 2 dogs",
      });
    }

    // ---------------- Check or Save USER ----------------
    let user = await User.findOne({ email: pupParent.email });

    if (!user) {
      // User doesn't exist → create new
      user = new User(pupParent);
      await user.save({ session });
    }

    // ---------------- Prepare Dog Document ----------------
    const userDogDoc = new UserDogs({
      userFK: user._id, // use existing or newly created user ID
      dogs: dogs, // already validated
    });

    await userDogDoc.save({ session });

    // ---------------- Commit ----------------
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "User and dog(s) saved successfully",
      userId: user._id,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};
