import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";

import {
  getMyTransactions,
  getTransactionDetails,
} from "./transaction.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getMyTransactions);
router.get("/:id", getTransactionDetails);

export default router;
