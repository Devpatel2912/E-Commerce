import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import ReviewController from "./review.controller.js";

const router = Router();

router.post("/", authMiddleware, ReviewController.createReview);
router.get("/:id", ReviewController.getReview);
router.patch("/:id", authMiddleware, ReviewController.updateReview);
router.delete("/:id", authMiddleware, ReviewController.deleteReview);

export default router;
