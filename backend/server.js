require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const prisma = require("./config/database");

// Route imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const cameraRoutes = require("./routes/cameraRoutes");
const aiDetectionRoutes = require("./routes/aiDetectionRoutes");
const alertRoutes = require("./routes/alertRoutes");
const inspectionRoutes = require("./routes/inspectionRoutes");
const vcSessionRoutes = require("./routes/vcSessionRoutes");
const fileMetadataRoutes = require("./routes/fileMetadataRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const docRoutes = require("./routes/docRoutes");

// Error handling middleware
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers (allow Swagger UI without CSP restrictions)
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

// CORS configuration (allow frontend dev origins or custom env setting)
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:19006"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, postman)
            if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, true); // Dev-friendly fallback
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// Body parser with safe payload size limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Root health endpoint
app.get("/", (req, res) => {
    res.json({
        message: "DoSJE Monitoring Backend is running!",
    });
});

// Database connectivity test endpoint
app.get("/api/test-db", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            message: "PostgreSQL database connected successfully!",
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});

// API Documentation (Swagger UI at /api/docs and OpenAPI spec at /api/openapi.json)
app.use("/api", docRoutes);

// Application Core Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/ai", aiDetectionRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/vc-sessions", vcSessionRoutes);
app.use("/api/files", fileMetadataRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditLogRoutes);

// Catch-all 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
    });
}

module.exports = app;