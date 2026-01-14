const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/', feedbackController.createFeedback);

router.patch('/:id', feedbackController.updateFeedback);
router.get('/', feedbackController.getFeedbacks);

module.exports = router;
