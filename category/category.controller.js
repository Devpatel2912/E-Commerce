import {
    createCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    deleteCategoryService,
} from "./category.service.js";
import logger from "../config/logger.js";

const CategoryController = {
    createCategory: async (req, res, next) => {
        try {
            logger.info({ name: req.body?.name }, "Creating new category.");
            const category = await createCategoryService(req.body);

            logger.info(
                { categoryId: category.category_id, name: category.name },
                "Category created successfully.",
            );

            return res.status(201).json({
                success: true,
                message: "category created successfully",
                data: category,
            });
        } catch (error) {
            return next(error);
        }
    },

    getAllCategories: async (_req, res, next) => {
        try {
            logger.debug("Fetching all categories.");
            const categories = await getAllCategoriesService();

            return res.status(200).json({
                success: true,
                message: "Category fetched successfully.",
                count: categories.length,
                data: categories,
            });
        } catch (error) {
            return next(error);
        }
    },

    getCategoryById: async (req, res, next) => {
        try {
            logger.debug(
                { categoryId: req.params.id },
                "Fetching category by ID.",
            );
            const category = await getCategoryByIdService(req.params.id);

            return res.status(200).json({
                success: true,
                message: "Category fetched successfully.",
                data: category,
            });
        } catch (error) {
            return next(error);
        }
    },

    updateCategory: async (req, res, next) => {
        try {
            logger.info({ categoryId: req.params.id }, "Updating category.");
            const category = await updateCategoryService(
                req.params.id,
                req.body,
            );

            logger.info(
                { categoryId: req.params.id },
                "Category updated successfully.",
            );

            return res.status(200).json({
                success: true,
                message: "Category updated successfully.",
                data: category,
            });
        } catch (error) {
            return next(error);
        }
    },

    deleteCategory: async (req, res, next) => {
        try {
            logger.info({ categoryId: req.params.id }, "Deleting category.");
            const category = await deleteCategoryService(req.params.id);

            logger.info(
                { categoryId: req.params.id },
                "Category deleted successfully.",
            );

            return res.status(200).json({
                success: true,
                message: "Category deleted successfully.",
                data: category,
            });
        } catch (error) {
            return next(error);
        }
    },
};

export const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} = CategoryController;

export default CategoryController;
