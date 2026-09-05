const express = require("express");
const rateLimit = require("express-rate-limit");

const {
    register,
    login,
    getMe,
} = require("../controllers/authController");

const { authenticate } = require("../middleware/authMiddleware");
const { validate, registerRules, loginRules } = require("../middleware/validator");

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again later",
    },
});

router.post("/register", authLimiter, validate(registerRules), register);
router.post("/login", authLimiter, validate(loginRules), login);
router.get("/me", authenticate, getMe);

module.exports = router;