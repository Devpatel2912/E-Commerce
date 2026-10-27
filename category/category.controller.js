import {
    createCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    deleteCategoryService,
} from "./category.service.js";

const createCategory = async (req, res, next) => {
    try {
        const category = await createCategoryService(req.body);

        return res.status(201).json({
            success: true,
            message: "category created successfully",
            data: category,
        });
    } catch (error) {
        return next(error);
    }
};

const getAllCategories = async (req, res, next) => {
    try {
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
};

const getCategoryById = async (req, res, next) => {
    try {
        const category = await getCategoryByIdService(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Category fetched successfully.",
            data: category,
        });
    } catch (error) {
        return next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const category = await updateCategoryService(req.params.id, req.body);

        return res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: category,
        });
    } catch (error) {
        return next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const category = await deleteCategoryService(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully.",
            data: category,
        });
    } catch (error) {
        return next(error);
    }
};

export {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
