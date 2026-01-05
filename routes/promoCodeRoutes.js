const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');

router.post('/', promoCodeController.createPromoCode);           // Create
router.get('/', promoCodeController.getAllPromoCodes);           // Get all
router.get('/:id', promoCodeController.getPromoCodeById);        // Get one
router.patch('/:id', promoCodeController.updatePromoCode);       // Update allowed fields
router.delete('/:id', promoCodeController.deletePromoCode);      // Delete

module.exports = router;
