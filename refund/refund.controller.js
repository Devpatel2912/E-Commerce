import {
    requestRefundService,
    listRefundsService,
    getRefundDetailsService,
    processRefundService,
} from "./refund.service.js";
import logger from "../config/logger.js";

function getUserId(req) {
    return req.user?.id ?? req.user?.userId;
}

const RefundController = {
    requestRefund: async (req, res, next) => {
        try {
            const userId = getUserId(req);
            const { payment_id, amount, reason } = req.body;
            logger.info({ userId, payment_id, amount }, "Requesting refund.");

            const refund = await requestRefundService({
                userId,
                payment_id,
                amount,
                reason,
            });

            logger.info(
                { refundId: refund.id, userId },
                "Refund request created successfully.",
            );

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
            const userId = getUserId(req);
            logger.debug({ userId }, "Listing user refunds.");
            const refunds = await listRefundsService(userId);

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
            const userId = getUserId(req);
            logger.debug(
                { refundId: req.params.id, userId },
                "Getting refund details.",
            );
            const refund = await getRefundDetailsService({
                id: req.params.id,
                userId,
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
            const userId = getUserId(req);
            logger.info(
                { refundId: req.params.id, userId },
                "Processing refund.",
            );
            const refund = await processRefundService({
                id: req.params.id,
                userId,
            });

            logger.info(
                { refundId: req.params.id, userId },
                "Refund moved to processing successfully.",
            );

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
