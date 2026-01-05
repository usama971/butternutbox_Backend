const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');

router.post('/', shippingController.createShipping);
router.get('/', shippingController.getShippings);

module.exports = router;
