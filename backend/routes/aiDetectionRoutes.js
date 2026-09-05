const express = require("express");
const {
    recordAIDetection,
    getAIDetections,
} = require("../controllers/aiDetectionController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.post("/detections", recordAIDetection);
router.get("/detections", getAIDetections);

module.exports = router;
