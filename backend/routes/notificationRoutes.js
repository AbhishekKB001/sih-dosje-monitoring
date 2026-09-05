const express = require("express");
const {
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require("../controllers/notificationController");
const { authenticate } = require("../middleware/authMiddleware");
const { validate, idParamRule } = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

router.get("/", getNotifications);
router.put("/read-all", markAllNotificationsAsRead);
router.get("/:id", validate(idParamRule), getNotificationById);
router.put("/:id/read", validate(idParamRule), markNotificationAsRead);

module.exports = router;
