import { Router } from "express";

import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from "./category.controller.js";

import {
    validateCategory,
    validateCategoryUpdate,
    validateCategoryId,
} from "./category.validation.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", getAllCategories);
router.get("/:id", validateCategoryId, getCategoryById);

router.post("/", authMiddleware, validateCategory, createCategory);

router.patch(
    "/:id",
    authMiddleware,
    validateCategoryId,
    validateCategoryUpdate,
    updateCategory,
);

router.delete("/:id", authMiddleware, validateCategoryId, deleteCategory);

export default router;
