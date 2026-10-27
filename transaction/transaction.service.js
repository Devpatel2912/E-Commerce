import {
    getTransactionsByUser,
    countTransactionsByUser,
    getTransactionById,
} from "./transaction.model.js";
import ApiError from "../utils/ApiError.js";

export const getMyTransactionsService = async ({
    userId,
    type = "all",
    page = 1,
    limit = 20,
}) => {
    if (!["all", "purchase", "sale"].includes(type)) {
        throw new ApiError(400, "type must be all, purchase, or sale.");
    }

    const numPage = Number(page);
    const numLimit = Number(limit);

    if (
        !Number.isInteger(numPage) ||
        numPage < 1 ||
        !Number.isInteger(numLimit) ||
        numLimit < 1 ||
        numLimit > 100
    ) {
        throw new ApiError(
            400,
            "page must be positive and limit must be between 1 and 100.",
        );
    }

    const offset = (numPage - 1) * numLimit;

    const [transactions, total] = await Promise.all([
        getTransactionsByUser({
            userId,
            type,
            limit: numLimit,
            offset,
        }),
        countTransactionsByUser({
            userId,
            type,
        }),
    ]);

    return {
        transactions,
        pagination: {
            page: numPage,
            limit: numLimit,
            total,
            totalPages: Math.ceil(total / numLimit),
        },
    };
};

export const getTransactionDetailsService = async ({
    transactionId,
    userId,
}) => {
    const numTransactionId = Number(transactionId);

    if (!Number.isSafeInteger(numTransactionId) || numTransactionId < 1) {
        throw new ApiError(400, "Transaction ID must be a positive integer.");
    }

    const transaction = await getTransactionById({
        transactionId: numTransactionId,
        userId,
    });

    if (!transaction) {
        throw new ApiError(404, "Transaction not found.");
    }

    return transaction;
};
