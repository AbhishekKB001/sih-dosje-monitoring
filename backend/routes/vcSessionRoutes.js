const express = require("express");
const { updateVCSession } = require("../controllers/vcSessionController");
const { authenticate } = require("../middleware/authMiddleware");
const { validate, idParamRule } = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

router.put("/:id", validate(idParamRule), updateVCSession);

module.exports = router;
