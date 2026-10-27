import {
    getMyTransactionsService,
    getTransactionDetailsService,
} from "./transaction.service.js";

const TransactionController = {
    getMyTransactions: async (req, res, next) => {
        try {
            const { type, page, limit } = req.query;
            const userId = req.user.id;

            const { transactions, pagination } = await getMyTransactionsService(
                {
                    userId,
                    type,
                    page,
                    limit,
                },
            );

            return res.status(200).json({
                success: true,
                message: "Transactions retrieved successfully.",
                data: transactions,
                pagination,
            });
        } catch (error) {
            next(error);
        }
    },

    getTransactionDetails: async (req, res, next) => {
        try {
            const transaction = await getTransactionDetailsService({
                transactionId: req.params.id,
                userId: req.user.id,
            });

            return res.status(200).json({
                success: true,
                message: "Transaction details retrieved successfully.",
                data: transaction,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const { getMyTransactions, getTransactionDetails } =
    TransactionController;

export default TransactionController;
