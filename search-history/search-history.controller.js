import {
    saveSearchHistoryService,
    getSearchHistoryService,
    deleteSearchHistoryItemService,
    clearSearchHistoryService,
} from "./search-history.service.js";

const getAuthUserId = (req) => {
    return req.user?.id ?? req.user?.user_id;
};

export const saveSearchHistory = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const { keyword, category_id, min_price, max_price } = req.body || {};

        const createdRecord = await saveSearchHistoryService({
            userId,
            keyword,
            category_id,
            min_price,
            max_price,
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
        const userId = getAuthUserId(req);
        const history = await getSearchHistoryService(userId);

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
        const userId = getAuthUserId(req);
        const deletedRecord = await deleteSearchHistoryItemService({
            searchId: req.params.id,
            userId,
        });

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
        const userId = getAuthUserId(req);
        const deletedCount = await clearSearchHistoryService(userId);

        return res.status(200).json({
            success: true,
            message: "Search history cleared successfully.",
            deletedCount,
        });
    } catch (error) {
        next(error);
    }
};
