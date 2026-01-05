const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authorizePermissions  = require('../controllers/middlewares/authorizePermissions');
const authenticateJWT  = require('../controllers/middlewares/authenticateJWT');

router.post('/', authorizePermissions(['MANAGE_ROLES']), roleController.createRole);
router.get('/',authenticateJWT,authorizePermissions(['MANAGE_PRODUCTS']), roleController.getRoles);
module.exports = router;
