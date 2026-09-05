const express = require("express");
const {
    getInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    updateInspectionStatus,
    deleteInspection,
    getInspectionReport,
    createInspectionReport,
    updateInspectionReport,
} = require("../controllers/inspectionController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
    validate,
    idParamRule,
    createInspectionRules,
    updateInspectionStatusRules,
} = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

// Inspection CRUD
router.get("/", getInspections);
router.get("/:id", validate(idParamRule), getInspectionById);
router.post(
    "/",
    authorize("ADMIN", "PROJECT_INCHARGE"),
    validate(createInspectionRules),
    createInspection
);
router.put("/:id", authorize("ADMIN", "PROJECT_INCHARGE"), updateInspection);
router.put(
    "/:id/status",
    validate(updateInspectionStatusRules),
    updateInspectionStatus
);
router.delete("/:id", authorize("ADMIN"), validate(idParamRule), deleteInspection);

const {
    createVCSession,
    getVCSessionsByInspection,
} = require("../controllers/vcSessionController");

// Inspection Report
router.get("/:id/report", validate(idParamRule), getInspectionReport);
router.post("/:id/report", validate(idParamRule), createInspectionReport);
router.put("/:id/report", validate(idParamRule), updateInspectionReport);

// Inspection VC Sessions (Member 3)
router.post("/:id/vc-sessions", validate(idParamRule), createVCSession);
router.get("/:id/vc-sessions", validate(idParamRule), getVCSessionsByInspection);

// Inspection File Metadata (Member 5)
const {
    getInspectionFiles,
    createFileMetadata,
} = require("../controllers/fileMetadataController");

router.get("/:id/files", validate(idParamRule), getInspectionFiles);
router.post("/:id/files", validate(idParamRule), createFileMetadata);

module.exports = router;
