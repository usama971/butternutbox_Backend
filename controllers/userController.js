const User = require('../Models/userModel');
const Pet = require('../Models/pet1');
const Order = require('../Models/order');
const userValidation = require('../validation/userValidation');

exports.createUser = async (req, res) => {
  try {
    const { error } = userValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(400).json({ error: 'Email already exists' });

    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json({ message: 'User created', data: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    let adminId = req.user.userId;

    const users = await User.find({ adminId });
    res.json({ message: 'Users fetched', data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserAllDetails = async (req, res) => {
  try {
    let adminId = req.user.userId;



    
    const userId = req.params.id;

    // 1. Get user
    const user = await User.findById({_id:userId}).lean();

    // when we will inject the admin in the user 
    // const user = await User.findById({_id:userId,,
    //   adminId: adminId}).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Get pets by userId
    const pets = await Pet.find({ userId }).lean();

    // 3. Get orders by userId
    const orders = await Order.find({ userId }).lean();

    // 4. Send combined response
    res.json({
      message: "User details fetched",
      data: {
        // user,
        pets,
        orders
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
