import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import PaymentController from "./payment.controller.js";

const router = Router();

router.get("/methods", PaymentController.listPaymentMethods);
router.post("/initiate", authMiddleware, PaymentController.initiatePayment);
router.get(
    "/:paymentId/status",
    authMiddleware,
    PaymentController.getPaymentStatus,
);

export default router;
