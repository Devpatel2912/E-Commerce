import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import requireAdmin from "./admin.middleware.js";
import AdminController from "./admin.controller.js";
import {
    validateAdminIdParam,
    validateAdminPagination,
    validateEditUser,
    validateIssueRefund,
    validateUpdateRefundStatus,
} from "./admin.validation.js";

const router = Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get("/users", validateAdminPagination, AdminController.listUsers);
router.get("/users/:id", validateAdminIdParam, AdminController.getUserById);
router.patch(
    "/users/:id",
    validateAdminIdParam,
    validateEditUser,
    AdminController.editUser,
);
router.delete("/users/:id", validateAdminIdParam, AdminController.deleteUser);

router.get("/refunds", validateAdminPagination, AdminController.listRefunds);
router.get("/refunds/:id", validateAdminIdParam, AdminController.getRefundById);
router.post("/refunds", validateIssueRefund, AdminController.issueRefund);
router.patch(
    "/refunds/:id",
    validateAdminIdParam,
    validateUpdateRefundStatus,
    AdminController.updateRefundStatus,
);

export default router;
