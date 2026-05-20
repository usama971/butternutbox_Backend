const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authorizePermissions  = require('../controllers/middlewares/authorizePermissions');

// add admin
router.post('/add', authorizePermissions(['MANAGE_USERS']), superAdminController.createSuperAdmin);
router.post('/add/employee', authorizePermissions(['MANAGE_EMPLOYEES']), superAdminController.createEmployee);
router.patch('/update/employee/:id', authorizePermissions(['MANAGE_EMPLOYEES']), superAdminController.updateEmployee);
router.patch("/update/employee/status/:id",
    authorizePermissions(["MANAGE_EMPLOYEES"]),
    superAdminController.updateEmployeeStatus
  );
router.get('/',authorizePermissions(['MANAGE_USERS']),  superAdminController.getSuperAdmins);
router.get('/employees',authorizePermissions(['MANAGE_EMPLOYEES']),  superAdminController.getEmployees);

module.exports = router;
