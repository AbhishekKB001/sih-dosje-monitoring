const express = require("express");
const {
    getAlerts,
    getAlertById,
    createAlert,
    updateAlertStatus,
} = require("../controllers/alertController");
const { authenticate } = require("../middleware/authMiddleware");
const {
    validate,
    idParamRule,
    createAlertRules,
    updateAlertStatusRules,
} = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

router.get("/", getAlerts);
router.get("/:id", validate(idParamRule), getAlertById);
router.post("/", validate(createAlertRules), createAlert);
router.put("/:id/status", validate(updateAlertStatusRules), updateAlertStatus);

module.exports = router;
