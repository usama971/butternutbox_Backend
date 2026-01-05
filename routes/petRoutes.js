const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');

router.post('/', petController.createPet);
router.get('/', petController.getPets);
router.patch('/:petId', petController.updatePet);

module.exports = router;
