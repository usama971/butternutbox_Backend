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
exports.getUsersWithTotalPetsAndOrders = async (req, res) => {
  try {
    // 1. Get adminId from token
    // const adminId = req.user.userId;

    console.log("Fetching users for admin:", req.user);
    // 2. Get userId from params
    const userId = req.user.userId;

    // 3. Get the user and make sure it belongs to the admin
    const user = await User.findOne({ _id: userId })
    .select("-_id name email phone address city state houseNumber postCode")
    .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found or does not belong to this admin" });
    }

    // 4. Get pets of this user
    const pets = await Pet.find({ userId }).lean();

    // 5. Get orders of this user
    const orders = await Order.find({ userId }).lean();

    // 6. Send combined response with totals
    res.json({
      message: "User details fetched",
      data: {
        user,
        totalPets: pets.length,
        totalOrders: orders.length,
        // pets,
        // orders,
      },
    });
  } catch (err) {
    console.error(err);
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
