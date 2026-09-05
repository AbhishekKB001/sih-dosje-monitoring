const express = require("express");
const {
    getCameras,
    getCameraById,
    createCamera,
    updateCamera,
    updateCameraStatus,
} = require("../controllers/cameraController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
    validate,
    idParamRule,
    createCameraRules,
    updateCameraStatusRules,
} = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

router.get("/", getCameras);
router.get("/:id", validate(idParamRule), getCameraById);
router.post(
    "/",
    authorize("ADMIN", "PROJECT_INCHARGE"),
    validate(createCameraRules),
    createCamera
);
router.put(
    "/:id",
    authorize("ADMIN", "PROJECT_INCHARGE"),
    updateCamera
);
router.post(
    "/:camera_id/status",
    validate(updateCameraStatusRules),
    updateCameraStatus
);

module.exports = router;
