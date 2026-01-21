const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/info', userController.getUsersWithTotalPetsAndOrders);
router.get('/:id', userController.getUserAllDetails);

module.exports = router;
