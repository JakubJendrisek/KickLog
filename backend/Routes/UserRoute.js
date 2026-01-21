const express = require("express");

const router = express.Router();

const { registerUser, loginUser, changePassword } = require("../Controllers/UserControllers");

router.post("/register", (req,res) => registerUser(req, res));

router.post("/login", (req, res) => loginUser(req, res));

router.post("/change-password", (req, res) => changePassword(req, res));

module.exports = router;