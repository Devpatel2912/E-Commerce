import { Router } from "express";
import {
    requestRefund,
    listRefunds,
    getRefundDetails,
    processRefund,
} from "./refund.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.post("/", requestRefund);
router.get("/", listRefunds);
router.get("/:id", getRefundDetails);
router.post("/:id/process", processRefund);

export default router;
