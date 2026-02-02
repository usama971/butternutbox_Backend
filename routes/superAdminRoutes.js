const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authorizePermissions  = require('../controllers/middlewares/authorizePermissions');

router.post('/', superAdminController.createSuperAdmin);
router.get('/',authorizePermissions(['MANAGE_USERS']),  superAdminController.getSuperAdmins);

module.exports = router;
