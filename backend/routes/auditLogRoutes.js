const express = require("express");
const { getAuditLogs } = require("../controllers/auditLogController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", getAuditLogs);

module.exports = router;
