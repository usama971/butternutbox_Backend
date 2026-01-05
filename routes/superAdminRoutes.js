const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

router.post('/', superAdminController.createSuperAdmin);
router.get('/', superAdminController.getSuperAdmins);

module.exports = router;
