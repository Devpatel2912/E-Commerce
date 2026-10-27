import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import {
    createReview,
    getReview,
    updateReview,
    deleteReview,
} from "./review.controller.js";

const router = Router();

router.post("/", authMiddleware, createReview);
router.get("/:id", getReview);
router.patch("/:id", authMiddleware, updateReview);
router.delete("/:id", authMiddleware, deleteReview);

export default router;
