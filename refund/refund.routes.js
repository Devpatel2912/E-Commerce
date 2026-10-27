import { Router } from "express";
import RefundController from "./refund.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.post("/", RefundController.requestRefund);
router.get("/", RefundController.listRefunds);
router.get("/:id", RefundController.getRefundDetails);
router.post("/:id/process", RefundController.processRefund);

export default router;
