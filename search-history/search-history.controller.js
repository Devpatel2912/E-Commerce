import {
    saveSearchHistoryService,
    getSearchHistoryService,
    deleteSearchHistoryItemService,
    clearSearchHistoryService,
} from "./search-history.service.js";
import logger from "../config/logger.js";

const getAuthUserId = (req) => {
    return req.user?.id ?? req.user?.user_id;
};

const SearchHistoryController = {
    saveSearchHistory: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            const { keyword, category_id, min_price, max_price } =
                req.body || {};
            logger.debug(
                { userId, keyword, category_id },
                "Saving search history entry.",
            );

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
    },

    getSearchHistory: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            logger.debug({ userId }, "Retrieving search history.");
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
    },

    deleteSearchHistoryItem: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            logger.info(
                { searchId: req.params.id, userId },
                "Deleting search history item.",
            );
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
    },

    clearSearchHistory: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            logger.info({ userId }, "Clearing all search history.");
            const deletedCount = await clearSearchHistoryService(userId);

            return res.status(200).json({
                success: true,
                message: "Search history cleared successfully.",
                deletedCount,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const {
    saveSearchHistory,
    getSearchHistory,
    deleteSearchHistoryItem,
    clearSearchHistory,
} = SearchHistoryController;

export default SearchHistoryController;
