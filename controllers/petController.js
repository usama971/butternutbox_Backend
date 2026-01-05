const Pet = require('../Models/pet1');
const petValidation = require('../validation/petValidation');

exports.createPet = async (req, res) => {
  try {
    const { error } = petValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const pet = new Pet(req.body);
    await pet.save();
    res.status(201).json({ message: 'Pet created', data: pet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPets = async (req, res) => {
  try {
    const pets = await Pet.find().populate('userId');
    res.json({ message: 'Pets fetched', data: pets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updatePet = async (req, res) => {
  try {
    const { petId } = req.params;

    // 1️⃣ Check if pet exists
    const existingPet = await Pet.findById(petId);
    if (!existingPet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    // 2️⃣ Validate incoming data
    const { error } = petValidation.validate(
      { ...req.body, userId: existingPet.userId.toString() },
      { allowUnknown: true } // allows partial updates
    );

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 3️⃣ Duplicate check (only if name or breed is being updated)
    if (req.body.name || req.body.breed) {
      const duplicatePet = await Pet.findOne({
        _id: { $ne: petId }, // exclude current pet
        userId: existingPet.userId,
        name: req.body.name || existingPet.name,
        breed: req.body.breed || existingPet.breed
      });

      if (duplicatePet) {
        return res.status(409).json({
          message: "A pet with the same name and breed already exists"
        });
      }
    }

    // 4️⃣ Update pet
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { $set: req.body },
      { new: true }
    );

    return res.status(200).json({
      message: "Pet updated successfully",
      data: updatedPet
    });

  } catch (err) {
    console.error("Update Pet Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

