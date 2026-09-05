const prisma = require("../config/database");
const { hashPassword } = require("../utils/password");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

const USER_SELECT_FIELDS = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    createdAt: true,
    updatedAt: true,
};

async function getUsers(req, res, next) {
    try {
        const { role, status, search } = req.query;

        const where = {};
        if (role) where.role = role;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const users = await prisma.user.findMany({
            where,
            select: USER_SELECT_FIELDS,
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        next(error);
    }
}

async function getUserById(req, res, next) {
    try {
        const userId = Number(req.params.id);
        if (Number.isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        // Allow Admin or self
        if (req.user.role !== "ADMIN" && req.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view this user profile",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                ...USER_SELECT_FIELDS,
                inspections: {
                    select: { id: true, projectId: true, type: true, status: true, scheduledDate: true },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
}

async function createUser(req, res, next) {
    try {
        const { name, email, phone, password, role, status } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists",
            });
        }

        const passwordHash = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                passwordHash,
                role: role || "VIEWER",
                status: status || "ACTIVE",
            },
            select: USER_SELECT_FIELDS,
        });

        await logAudit({
            userId: req.user?.userId,
            action: ACTIONS.CREATE_USER,
            details: { createdUserId: newUser.id, role: newUser.role, email: newUser.email },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser,
        });
    } catch (error) {
        next(error);
    }
}

async function updateUser(req, res, next) {
    try {
        const userId = Number(req.params.id);
        if (Number.isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const isSelf = req.user.userId === userId;
        const isAdmin = req.user.role === "ADMIN";

        if (!isAdmin && !isSelf) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update this user",
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const { name, email, phone, password, role, status } = req.body;
        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;

        // Email update check
        if (email && email !== existingUser.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(409).json({
                    success: false,
                    message: "Email is already taken by another user",
                });
            }
            updateData.email = email;
        }

        // Only ADMIN can change role or status
        if (role !== undefined) {
            if (!isAdmin) {
                return res.status(403).json({ success: false, message: "Only ADMIN can change user roles" });
            }
            updateData.role = role;
        }

        if (status !== undefined) {
            if (!isAdmin) {
                return res.status(403).json({ success: false, message: "Only ADMIN can change user status" });
            }
            updateData.status = status;
        }

        if (password) {
            updateData.passwordHash = await hashPassword(password);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: USER_SELECT_FIELDS,
        });

        await logAudit({
            userId: req.user?.userId,
            action: ACTIONS.UPDATE_USER,
            details: { updatedUserId: userId, updatedFields: Object.keys(updateData) },
            req,
        });

        return res.json({
            success: true,
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        next(error);
    }
}

async function deleteUser(req, res, next) {
    try {
        const userId = Number(req.params.id);
        if (Number.isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        if (req.user.userId === userId) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own active account",
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        await logAudit({
            userId: req.user?.userId,
            action: ACTIONS.DELETE_USER,
            details: { deletedUserId: userId, email: existingUser.email },
            req,
        });

        return res.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
