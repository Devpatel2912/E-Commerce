import {
    createCategory as createCategoryModel,
    getAllCategories as getAllCategoriesModel,
    getCategoryById as getCategoryByIdModel,
    updateCategory as updateCategoryModel,
    deleteCategory as deleteCategoryModel,
} from "./category.model.js";
import ApiError from "../utils/ApiError.js";

export const createCategoryService = async (categoryData) => {
    try {
        const category = await createCategoryModel(categoryData);
        return category;
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(
                409,
                "A category with this name already exists.",
            );
        }
        throw error;
    }
};

export const getAllCategoriesService = async () => {
    return await getAllCategoriesModel();
};

export const getCategoryByIdService = async (id) => {
    const category = await getCategoryByIdModel(id);
    if (!category) {
        throw new ApiError(404, "Category not found.");
    }
    return category;
};

export const updateCategoryService = async (id, updateData) => {
    try {
        const category = await updateCategoryModel(id, updateData);
        if (!category) {
            throw new ApiError(404, "Category not found.");
        }
        return category;
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(
                409,
                "A category with this name already exists.",
            );
        }
        throw error;
    }
};

export const deleteCategoryService = async (id) => {
    try {
        const category = await deleteCategoryModel(id);
        if (!category) {
            throw new ApiError(404, "Category not found.");
        }
        return category;
    } catch (error) {
        if (error.code === "23503") {
            throw new ApiError(
                409,
                "This category is being used by other records and cannot be deleted.",
            );
        }
        throw error;
    }
};
