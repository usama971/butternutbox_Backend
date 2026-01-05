const express = require("express");
const router = express.Router();
const {registerWithDogs}  = require("../Controller/registerWithDogs");

router.post("/register-with-dogs", registerWithDogs);

module.exports = router;
