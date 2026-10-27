import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import SearchHistoryController from "./search-history.controller.js";

const router = Router();

router.post("/", authMiddleware, SearchHistoryController.saveSearchHistory);
router.get("/", authMiddleware, SearchHistoryController.getSearchHistory);
router.delete(
    "/:id",
    authMiddleware,
    SearchHistoryController.deleteSearchHistoryItem,
);
router.delete("/", authMiddleware, SearchHistoryController.clearSearchHistory);

export default router;
