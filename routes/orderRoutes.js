const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.createOrder);
router.post('/pet', orderController.createPetOrder);
router.get('/', orderController.getOrders);
router.get('/admin', orderController.getAllOrdersAdmin );
// router.get('/analytics/revenue', orderController.getRevenueAnalytics);
// router.get('/analytics/revenue-breakdown', orderController.getRevenueBreakdown);
// router.get('/analytics/kpis', orderController.getAdvancedKPIs);
router.get('/analytics', orderController.getAnalyticsCombined);
router.patch('/cancel', orderController.cancelOrder);
router.patch('/return', orderController.requestReturn);
router.patch('/dispute/:orderId', orderController.requestDispute);

router.patch('/return/update', orderController.updateReturnStatus);
router.patch('/refund', orderController.updateRefundStatus);
router.patch('/deliveryStatus', orderController.updateOrderDeliveryStatus);
router.patch('/dispute/resolved/:orderId', orderController.resolveDispute);

module.exports = router;
