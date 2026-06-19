const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authorizePermissions  = require('../controllers/middlewares/authorizePermissions');

router.post('/', subscriptionController.createSubscription);
router.get('/my', subscriptionController.getMySubscriptions);
router.get('/', authorizePermissions(['MANAGE_SUBSCRIPTIONS']), subscriptionController.getSubscriptions);
router.patch('/:id/cancel', subscriptionController.cancelSubscription);
router.patch('/:id/pause', subscriptionController.pauseSubscription);
router.patch('/:id/resume', subscriptionController.resumeSubscription);
router.patch('/:id/skip-next-delivery', subscriptionController.skipNextDelivery);
router.get('/:id/upcoming-order', subscriptionController.getUpcomingOrder);
router.patch('/:id/upcoming-order', subscriptionController.updateUpcomingOrder);
router.patch('/:id/delivery-address', subscriptionController.updateDeliveryAddress);

module.exports = router;
