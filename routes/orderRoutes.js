const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.createOrder);
router.post('/pet', orderController.createPetOrder);
router.get('/', orderController.getOrders);
router.patch('/cancel', orderController.cancelOrder);
router.patch('/return', orderController.requestReturn);

router.patch('/return/update', orderController.updateReturnStatus);
router.patch('/refund', orderController.updateRefundStatus);

module.exports = router;
