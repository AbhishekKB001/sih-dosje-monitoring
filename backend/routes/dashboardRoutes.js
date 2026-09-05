const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/summary", getDashboardSummary);

module.exports = router;
