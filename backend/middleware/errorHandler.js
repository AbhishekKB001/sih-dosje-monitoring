function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        message: `Resource not found: ${req.method} ${req.originalUrl}`,
    });
}

function errorHandler(err, req, res, next) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

    // Prisma Unique Constraint Violation
    if (err.code === "P2002") {
        const fields = err.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(", ") : err.meta.target) : "field";
        return res.status(409).json({
            success: false,
            message: `A record with this ${fields} already exists`,
        });
    }

    // Prisma Record Not Found
    if (err.code === "P2025") {
        return res.status(404).json({
            success: false,
            message: err.meta?.cause || "Record not found",
        });
    }

    // Prisma Foreign Key Constraint Failure
    if (err.code === "P2003") {
        return res.status(400).json({
            success: false,
            message: `Invalid reference: related entity does not exist (field: ${err.meta?.field_name || "unknown"})`,
        });
    }

    // Validation or manual custom error status
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || "Internal server error";

    return res.status(statusCode).json({
        success: false,
        message,
        ...(err.errors && { errors: err.errors }),
    });
}

module.exports = {
    notFoundHandler,
    errorHandler,
};
