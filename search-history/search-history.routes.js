import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    saveSearchHistory,
    getSearchHistory,
    deleteSearchHistoryItem,
    clearSearchHistory,
} from "./search-history.controller.js";

const router = Router();

router.post("/", authMiddleware, saveSearchHistory);
router.get("/", authMiddleware, getSearchHistory);
router.delete("/:id", authMiddleware, deleteSearchHistoryItem);
router.delete("/", authMiddleware, clearSearchHistory);

export default router;
