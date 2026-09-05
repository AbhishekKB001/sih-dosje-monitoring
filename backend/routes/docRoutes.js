const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("../docs/openapiSpec");

const router = express.Router();

// Serve raw OpenAPI JSON
router.get("/openapi.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openapiSpec);
});

// Serve interactive Swagger UI documentation
router.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
        customSiteTitle: "DoSJE Monitoring API Documentation",
        customCss: ".swagger-ui .topbar { display: none }",
    })
);

module.exports = router;
