import { Router } from "express";

import CategoryController from "./category.controller.js";

import {
    validateCategory,
    validateCategoryUpdate,
    validateCategoryId,
} from "./category.validation.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", CategoryController.getAllCategories);
router.get("/:id", validateCategoryId, CategoryController.getCategoryById);

router.post(
    "/",
    authMiddleware,
    validateCategory,
    CategoryController.createCategory,
);

router.patch(
    "/:id",
    authMiddleware,
    validateCategoryId,
    validateCategoryUpdate,
    CategoryController.updateCategory,
);

router.delete(
    "/:id",
    authMiddleware,
    validateCategoryId,
    CategoryController.deleteCategory,
);

export default router;
