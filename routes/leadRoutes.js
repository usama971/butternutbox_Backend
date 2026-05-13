const express = require('express');
const router = express.Router();
const {createLead, getUnconvertedLeads} = require('../controllers/lead');
const authenticateJWT = require('../controllers/middlewares/authenticateJWT');
const authorizePermissions = require('../controllers/middlewares/authorizePermissions');

router.post("/add", createLead);
router.get("/all", authenticateJWT , authorizePermissions(['MANAGE_LEADS']), getUnconvertedLeads);
module.exports = router;
