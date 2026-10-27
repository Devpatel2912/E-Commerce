import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import {
  listPaymentMethods,
  initiatePayment,
  getPaymentStatus,
} from "./payment.controller.js";

const router = Router();

router.get("/methods", listPaymentMethods);
router.post("/initiate", authMiddleware, initiatePayment);
router.get("/:paymentId/status", authMiddleware, getPaymentStatus);

export default router;
