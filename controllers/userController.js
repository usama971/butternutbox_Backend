const User = require('../Models/userModel');
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
