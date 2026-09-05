const express = require("express");
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
} = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
    validate,
    idParamRule,
    createUserRules,
    updateUserRules,
} = require("../middleware/validator");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("ADMIN"), getUsers);
router.get("/:id", validate(idParamRule), getUserById);
router.post("/", authorize("ADMIN"), validate(createUserRules), createUser);
router.put("/:id", validate(updateUserRules), updateUser);
router.delete("/:id", authorize("ADMIN"), validate(idParamRule), deleteUser);

module.exports = router;
