import {
  createCategory as createCategoryModel,
  getAllCategories as getAllCategoriesModel,
  getCategoryById as getCategoryByIdModel,
  updateCategory as updateCategoryModel,
  deleteCategory as deleteCategoryModel,
} from "./category.model.js";

const createCategory = async (req, res, next) => {
  try {
    const category = await createCategoryModel(req.body);

    return res.status(201).json({
      success: true,
      message: "category created successfully",
      data: category,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }
    return next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await getAllCategoriesModel();

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
    const category = await getCategoryByIdModel(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

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
    const category = await updateCategoryModel(req.params.id, req.body);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }

    return next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await deleteCategoryModel(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
      data: category,
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This category is being used by other records and cannot be deleted.",
      });
    }

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
