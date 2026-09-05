const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function createProject(req, res, next) {
    try {
        const {
            projectCode,
            name,
            scheme,
            organizationName,
            institutionType,
            address,
            district,
            state,
            contactPerson,
            contactNumber,
            status,
            latitude,
            longitude,
        } = req.body;

        if (!projectCode || !name || !scheme || !organizationName || !district || !state) {
            return res.status(400).json({
                success: false,
                message:
                    "projectCode, name, scheme, organizationName, district and state are required",
            });
        }

        const existingProject = await prisma.project.findUnique({
            where: { projectCode },
        });

        if (existingProject) {
            return res.status(409).json({
                success: false,
                message: "Project with this projectCode already exists",
            });
        }

        const project = await prisma.project.create({
            data: {
                projectCode,
                name,
                scheme,
                organizationName,
                institutionType: institutionType || null,
                address: address || null,
                district,
                state,
                contactPerson: contactPerson || null,
                contactNumber: contactNumber || null,
                status: status || "ACTIVE",
                latitude: latitude !== undefined ? (latitude !== null ? Number(latitude) : null) : null,
                longitude: longitude !== undefined ? (longitude !== null ? Number(longitude) : null) : null,
                createdById: req.user?.userId || null,
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: project.id,
            action: ACTIONS.CREATE_PROJECT,
            details: { projectId: project.id, projectCode: project.projectCode, name: project.name },
            req,
        });

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            project,
        });
    } catch (error) {
        console.error("Create project error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to create project",
        });
    }
}

async function getProjects(req, res, next) {
    try {
        const { status, district, state, search } = req.query;

        const where = {};
        if (status) where.status = status;
        if (district) where.district = { contains: district, mode: "insensitive" };
        if (state) where.state = { contains: state, mode: "insensitive" };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { projectCode: { contains: search, mode: "insensitive" } },
                { organizationName: { contains: search, mode: "insensitive" } },
            ];
        }

        const projects = await prisma.project.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json({
            success: true,
            count: projects.length,
            projects,
        });
    } catch (error) {
        console.error("Get projects error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch projects",
        });
    }
}

async function getProjectById(req, res, next) {
    try {
        const projectId = Number(req.params.id);

        if (Number.isNaN(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID",
            });
        }

        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
            },
            include: {
                cameras: true,
                inspections: true,
                alerts: true,
            },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        res.json({
            success: true,
            project,
        });
    } catch (error) {
        console.error("Get project error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch project",
        });
    }
}

async function updateProject(req, res, next) {
    try {
        const projectId = Number(req.params.id);

        if (Number.isNaN(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID",
            });
        }

        const {
            projectCode,
            name,
            scheme,
            organizationName,
            institutionType,
            address,
            district,
            state,
            contactPerson,
            contactNumber,
            status,
            latitude,
            longitude,
        } = req.body;

        const existingProject = await prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!existingProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        if (projectCode && projectCode !== existingProject.projectCode) {
            const codeTaken = await prisma.project.findUnique({ where: { projectCode } });
            if (codeTaken) {
                return res.status(409).json({
                    success: false,
                    message: "Project with this projectCode already exists",
                });
            }
        }

        const project = await prisma.project.update({
            where: {
                id: projectId,
            },
            data: {
                projectCode,
                name,
                scheme,
                organizationName,
                institutionType,
                address,
                district,
                state,
                contactPerson,
                contactNumber,
                status,
                latitude: latitude !== undefined ? (latitude !== null ? Number(latitude) : null) : undefined,
                longitude: longitude !== undefined ? (longitude !== null ? Number(longitude) : null) : undefined,
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: project.id,
            action: ACTIONS.UPDATE_PROJECT,
            details: { projectId: project.id, projectCode: project.projectCode },
            req,
        });

        res.json({
            success: true,
            message: "Project updated successfully",
            project,
        });
    } catch (error) {
        console.error("Update project error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to update project",
        });
    }
}

async function deleteProject(req, res, next) {
    try {
        const projectId = Number(req.params.id);

        if (Number.isNaN(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID",
            });
        }

        const existingProject = await prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!existingProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        await prisma.project.delete({
            where: {
                id: projectId,
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId,
            action: ACTIONS.DELETE_PROJECT,
            details: { projectId, projectCode: existingProject.projectCode },
            req,
        });

        res.json({
            success: true,
            message: "Project deleted successfully",
        });
    } catch (error) {
        console.error("Delete project error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to delete project",
        });
    }
}

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
};