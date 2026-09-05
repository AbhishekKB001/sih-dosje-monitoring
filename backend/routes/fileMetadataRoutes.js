const express = require("express");
const { deleteFileMetadata } = require("../controllers/fileMetadataController");
const { authenticate } = require("../middleware/authMiddleware");
const { validate, idParamRule } = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

router.delete("/:id", validate(idParamRule), deleteFileMetadata);

module.exports = router;
