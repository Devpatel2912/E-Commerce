import {
  getTransactionsByUser,
  countTransactionsByUser,
  getTransactionById,
} from "./transaction.model.js";

export const getMyTransactions = async (req, res, next) => {
  try {
    const type = req.query.type || "all";
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);

    if (!["all", "purchase", "sale"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be all, purchase, or sale.",
      });
    }

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "page must be positive and limit must be between 1 and 100.",
      });
    }

    const userId = req.user.id;
    const offset = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      getTransactionsByUser({
        userId,
        type,
        limit,
        offset,
      }),
      countTransactionsByUser({
        userId,
        type,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully.",
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionDetails = async (req, res, next) => {
  try {
    const transactionId = Number(req.params.id);

    if (
      !Number.isSafeInteger(transactionId) ||
      transactionId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID must be a positive integer.",
      });
    }

    const transaction = await getTransactionById({
      transactionId,
      userId: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction details retrieved successfully.",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};
