import {
    createSearchHistory,
    getSearchHistoryByUserId,
    deleteSearchHistoryByIdAndUserId,
    clearSearchHistoryByUserId,
} from "./search-history.model.js";
import { getCategoryById } from "../category/category.model.js";
import ApiError from "../utils/ApiError.js";

export const saveSearchHistoryService = async ({
    userId,
    keyword,
    category_id,
    min_price,
    max_price,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
        throw new ApiError(400, "Keyword is required.");
    }

    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword.length > 255) {
        throw new ApiError(400, "Keyword must not exceed 255 characters.");
    }

    let parsedCategoryId = null;
    if (
        category_id !== undefined &&
        category_id !== null &&
        category_id !== ""
    ) {
        const numCategory = Number(category_id);
        if (!Number.isSafeInteger(numCategory) || numCategory <= 0) {
            throw new ApiError(400, "category_id must be a positive integer.");
        }

        const category = await getCategoryById(numCategory);
        if (!category) {
            throw new ApiError(400, "Category not found.");
        }

        parsedCategoryId = numCategory;
    }

    let parsedMinPrice = null;
    if (min_price !== undefined && min_price !== null && min_price !== "") {
        const numMin = Number(min_price);
        if (!Number.isFinite(numMin) || numMin < 0) {
            throw new ApiError(400, "min_price must be a non-negative number.");
        }
        parsedMinPrice = numMin;
    }

    let parsedMaxPrice = null;
    if (max_price !== undefined && max_price !== null && max_price !== "") {
        const numMax = Number(max_price);
        if (!Number.isFinite(numMax) || numMax < 0) {
            throw new ApiError(400, "max_price must be a non-negative number.");
        }
        parsedMaxPrice = numMax;
    }

    if (
        parsedMinPrice !== null &&
        parsedMaxPrice !== null &&
        parsedMinPrice > parsedMaxPrice
    ) {
        throw new ApiError(400, "min_price cannot exceed max_price.");
    }

    const createdRecord = await createSearchHistory({
        userId,
        keyword: trimmedKeyword,
        categoryId: parsedCategoryId,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
    });

    return createdRecord;
};

export const getSearchHistoryService = async (userId) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    return await getSearchHistoryByUserId(userId);
};

export const deleteSearchHistoryItemService = async ({ searchId, userId }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const numSearchId = Number(searchId);
    if (!Number.isSafeInteger(numSearchId) || numSearchId <= 0) {
        throw new ApiError(400, "Invalid search history ID.");
    }

    const deletedRecord = await deleteSearchHistoryByIdAndUserId(
        numSearchId,
        userId,
    );

    if (!deletedRecord) {
        throw new ApiError(404, "Search history entry not found.");
    }

    return deletedRecord;
};

export const clearSearchHistoryService = async (userId) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    return await clearSearchHistoryByUserId(userId);
};
