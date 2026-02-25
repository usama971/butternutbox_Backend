const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authorizePermissions  = require('../controllers/middlewares/authorizePermissions');

router.post('/', subscriptionController.createSubscription);
router.get('/',authorizePermissions(['MANAGE_SUBSCRIPTIONS']), subscriptionController.getSubscriptions);

module.exports = router;
