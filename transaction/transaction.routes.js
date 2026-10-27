import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";

import TransactionController from "./transaction.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", TransactionController.getMyTransactions);
router.get("/:id", TransactionController.getTransactionDetails);

export default router;
