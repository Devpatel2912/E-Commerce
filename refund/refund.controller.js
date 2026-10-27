import {
    requestRefundService,
    listRefundsService,
    getRefundDetailsService,
    processRefundService,
} from "./refund.service.js";

function getUserId(req) {
    return req.user?.id ?? req.user?.userId;
}

const RefundController = {
    requestRefund: async (req, res, next) => {
        try {
            const userId = getUserId(req);
            const { payment_id, amount, reason } = req.body;

            const refund = await requestRefundService({
                userId,
                payment_id,
                amount,
                reason,
            });

            return res.status(201).json({
                success: true,
                message: "Refund request created successfully.",
                data: refund,
            });
        } catch (error) {
            next(error);
        }
    },

    listRefunds: async (req, res, next) => {
        try {
            const refunds = await listRefundsService(getUserId(req));

            return res.status(200).json({
                success: true,
                count: refunds.length,
                data: refunds,
            });
        } catch (error) {
            next(error);
        }
    },

    getRefundDetails: async (req, res, next) => {
        try {
            const refund = await getRefundDetailsService({
                id: req.params.id,
                userId: getUserId(req),
            });

            return res.status(200).json({
                success: true,
                data: refund,
            });
        } catch (error) {
            next(error);
        }
    },

    processRefund: async (req, res, next) => {
        try {
            const refund = await processRefundService({
                id: req.params.id,
                userId: getUserId(req),
            });

            return res.status(200).json({
                success: true,
                message:
                    "Refund moved to processing. Payment-provider processing is still required.",
                data: refund,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const { requestRefund, listRefunds, getRefundDetails, processRefund } =
    RefundController;

export default RefundController;
