const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');

router.post('/', promoCodeController.validatePromoCode );         
    

module.exports = router;
