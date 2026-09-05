const express = require("express");

const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
} = require("../controllers/projectController");

const { getCamerasByProjectId } = require("../controllers/cameraController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { validate, idParamRule, createProjectRules } = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

// View projects
router.get("/", getProjects);
router.get("/:id", validate(idParamRule), getProjectById);

// Member 2 Integration: GET /api/projects/:project_id/cameras
router.get("/:project_id/cameras", getCamerasByProjectId);

// Create, update and delete projects (Admin only)
router.post(
    "/",
    authorize("ADMIN"),
    validate(createProjectRules),
    createProject
);

router.put(
    "/:id",
    authorize("ADMIN"),
    validate(idParamRule),
    updateProject
);

router.delete(
    "/:id",
    authorize("ADMIN"),
    validate(idParamRule),
    deleteProject
);

module.exports = router;