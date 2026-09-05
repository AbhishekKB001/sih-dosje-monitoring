const prisma = require("../config/database");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function register(req, res, next) {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
            });
        }

        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                passwordHash,
                role: role || "VIEWER",
            },
        });

        await logAudit({
            userId: user.id,
            action: ACTIONS.REGISTER,
            details: { email: user.email, role: user.role },
            req,
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to register user",
        });
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "User account is not active",
            });
        }

        const passwordValid = await comparePassword(
            password,
            user.passwordHash
        );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = generateToken(user);

        await logAudit({
            userId: user.id,
            action: ACTIONS.LOGIN,
            details: { email: user.email, role: user.role },
            req,
        });

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to login",
        });
    }
}

async function getMe(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Get user error:", error);
        if (next) return next(error);
        res.status(500).json({
            success: false,
            message: "Failed to get user information",
        });
    }
}

module.exports = {
    register,
    login,
    getMe,
};