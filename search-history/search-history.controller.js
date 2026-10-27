import {
  createSearchHistory,
  getSearchHistoryByUserId,
  deleteSearchHistoryByIdAndUserId,
  clearSearchHistoryByUserId,
} from "./search-history.model.js";
import { getCategoryById } from "../category/category.model.js";

export const saveSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { keyword, category_id, min_price, max_price } = req.body || {};

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required.",
      });
    }

    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Keyword must not exceed 255 characters.",
      });
    }

    let parsedCategoryId = null;
    if (
      category_id !== undefined &&
      category_id !== null &&
      category_id !== ""
    ) {
      const numCategory = Number(category_id);
      if (!Number.isSafeInteger(numCategory) || numCategory <= 0) {
        return res.status(400).json({
          success: false,
          message: "category_id must be a positive integer.",
        });
      }

      const category = await getCategoryById(numCategory);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category not found.",
        });
      }

      parsedCategoryId = numCategory;
    }

    let parsedMinPrice = null;
    if (min_price !== undefined && min_price !== null && min_price !== "") {
      const numMin = Number(min_price);
      if (!Number.isFinite(numMin) || numMin < 0) {
        return res.status(400).json({
          success: false,
          message: "min_price must be a non-negative number.",
        });
      }
      parsedMinPrice = numMin;
    }

    let parsedMaxPrice = null;
    if (max_price !== undefined && max_price !== null && max_price !== "") {
      const numMax = Number(max_price);
      if (!Number.isFinite(numMax) || numMax < 0) {
        return res.status(400).json({
          success: false,
          message: "max_price must be a non-negative number.",
        });
      }
      parsedMaxPrice = numMax;
    }

    if (
      parsedMinPrice !== null &&
      parsedMaxPrice !== null &&
      parsedMinPrice > parsedMaxPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "min_price cannot exceed max_price.",
      });
    }

    const createdRecord = await createSearchHistory({
      userId,
      keyword: trimmedKeyword,
      categoryId: parsedCategoryId,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
    });

    return res.status(201).json({
      success: true,
      message: "Search history saved successfully.",
      data: createdRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const history = await getSearchHistoryByUserId(userId);

    return res.status(200).json({
      success: true,
      message: "Search history retrieved successfully.",
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSearchHistoryItem = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const searchId = Number(req.params.id);
    if (!Number.isSafeInteger(searchId) || searchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid search history ID.",
      });
    }

    const deletedRecord = await deleteSearchHistoryByIdAndUserId(
      searchId,
      userId
    );

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: "Search history entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Search history entry deleted successfully.",
      data: deletedRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const clearSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const deletedCount = await clearSearchHistoryByUserId(userId);

    return res.status(200).json({
      success: true,
      message: "Search history cleared successfully.",
      deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
