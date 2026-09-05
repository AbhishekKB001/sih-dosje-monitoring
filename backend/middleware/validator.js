const { body, param, query, validationResult } = require("express-validator");

function validate(validations) {
    return async (req, res, next) => {
        for (let validation of validations) {
            const result = await validation.run(req);
            if (result.errors.length) break;
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            success: false,
            message: "Validation failed: " + errors.array().map(e => `${e.path}: ${e.msg}`).join(", "),
            errors: errors.array().map(e => ({
                field: e.path,
                message: e.msg,
            })),
        });
    };
}

const idParamRule = [
    param("id").isInt({ min: 1 }).withMessage("ID must be a valid positive integer"),
];

const registerRules = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    body("role")
        .optional()
        .isIn(["ADMIN", "INSPECTOR", "PROJECT_INCHARGE", "STAFF", "VIEWER"])
        .withMessage("Invalid role specified"),
];

const loginRules = [
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
];

const createUserRules = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    body("role")
        .isIn(["ADMIN", "INSPECTOR", "PROJECT_INCHARGE", "STAFF", "VIEWER"])
        .withMessage("Valid role is required"),
    body("status")
        .optional()
        .isIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
        .withMessage("Invalid status specified"),
];

const updateUserRules = [
    param("id").isInt({ min: 1 }).withMessage("Invalid user ID"),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role")
        .optional()
        .isIn(["ADMIN", "INSPECTOR", "PROJECT_INCHARGE", "STAFF", "VIEWER"])
        .withMessage("Invalid role specified"),
    body("status")
        .optional()
        .isIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
        .withMessage("Invalid status specified"),
];

const createProjectRules = [
    body("projectCode").trim().notEmpty().withMessage("projectCode is required"),
    body("name").trim().notEmpty().withMessage("name is required"),
    body("scheme").trim().notEmpty().withMessage("scheme is required"),
    body("organizationName").trim().notEmpty().withMessage("organizationName is required"),
    body("district").trim().notEmpty().withMessage("district is required"),
    body("state").trim().notEmpty().withMessage("state is required"),
    body("status")
        .optional()
        .isIn(["ACTIVE", "INACTIVE", "COMPLETED", "SUSPENDED"])
        .withMessage("Invalid status"),
];

const createCameraRules = [
    body("cameraCode").trim().notEmpty().withMessage("cameraCode is required"),
    body("projectId").isInt({ min: 1 }).withMessage("Valid projectId is required"),
    body("name").trim().notEmpty().withMessage("name is required"),
    body("type")
        .optional()
        .isIn(["CCTV", "IP_CAMERA", "PTZ", "OTHER"])
        .withMessage("Invalid camera type"),
    body("status")
        .optional()
        .isIn(["ONLINE", "OFFLINE", "MAINTENANCE"])
        .withMessage("Invalid camera status"),
];

const updateCameraStatusRules = [
    param("camera_id").isInt({ min: 1 }).withMessage("camera_id must be a valid integer"),
    body("status")
        .isIn(["ONLINE", "OFFLINE", "MAINTENANCE"])
        .withMessage("Status must be ONLINE, OFFLINE, or MAINTENANCE"),
];

const createAiDetectionRules = [
    body("cameraId").isInt({ min: 1 }).withMessage("Valid cameraId is required"),
    body("objects").isArray().withMessage("objects must be an array"),
    body("confidence").optional().isFloat({ min: 0, max: 1 }).withMessage("Confidence must be between 0 and 1"),
];

const createAlertRules = [
    body("alertCode").trim().notEmpty().withMessage("alertCode is required"),
    body("projectId").isInt({ min: 1 }).withMessage("Valid projectId is required"),
    body("cameraId").optional().isInt({ min: 1 }).withMessage("cameraId must be a valid integer"),
    body("aiDetectionId").optional().isInt({ min: 1 }).withMessage("aiDetectionId must be a valid integer"),
    body("title").trim().notEmpty().withMessage("title is required"),
    body("riskLevel")
        .optional()
        .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        .withMessage("Invalid riskLevel"),
    body("status")
        .optional()
        .isIn(["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"])
        .withMessage("Invalid status"),
];

const updateAlertStatusRules = [
    param("id").isInt({ min: 1 }).withMessage("Alert ID must be a valid integer"),
    body("status")
        .isIn(["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"])
        .withMessage("Status must be ACTIVE, ACKNOWLEDGED, RESOLVED, or DISMISSED"),
];

const createInspectionRules = [
    body("projectId").isInt({ min: 1 }).withMessage("Valid projectId is required"),
    body("inspectorId").isInt({ min: 1 }).withMessage("Valid inspectorId is required"),
    body("type")
        .isIn(["ROUTINE", "SURPRISE", "SPECIAL", "REMOTE"])
        .withMessage("type must be ROUTINE, SURPRISE, SPECIAL, or REMOTE"),
    body("scheduledDate").optional().isISO8601().withMessage("scheduledDate must be a valid ISO8601 date"),
    body("status")
        .optional()
        .isIn(["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
        .withMessage("Invalid status"),
];

const updateInspectionStatusRules = [
    param("id").isInt({ min: 1 }).withMessage("Inspection ID must be a valid integer"),
    body("status")
        .isIn(["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
        .withMessage("status must be ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, or CANCELLED"),
];

module.exports = {
    validate,
    idParamRule,
    registerRules,
    loginRules,
    createUserRules,
    updateUserRules,
    createProjectRules,
    createCameraRules,
    updateCameraStatusRules,
    createAiDetectionRules,
    createAlertRules,
    updateAlertStatusRules,
    createInspectionRules,
    updateInspectionStatusRules,
};
