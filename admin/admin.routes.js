import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import requireAdmin from "./admin.middleware.js";
import {
  listUsers,
  getUserById,
  editUser,
  deleteUser,
  listRefunds,
  getRefundById,
  issueRefund,
  updateRefundStatus,
} from "./admin.controller.js";
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

router.get("/users", validateAdminPagination, listUsers);
router.get("/users/:id", validateAdminIdParam, getUserById);
router.patch("/users/:id", validateAdminIdParam, validateEditUser, editUser);
router.delete("/users/:id", validateAdminIdParam, deleteUser);

router.get("/refunds", validateAdminPagination, listRefunds);
router.get("/refunds/:id", validateAdminIdParam, getRefundById);
router.post("/refunds", validateIssueRefund, issueRefund);
router.patch(
  "/refunds/:id",
  validateAdminIdParam,
  validateUpdateRefundStatus,
  updateRefundStatus
);

export default router;
