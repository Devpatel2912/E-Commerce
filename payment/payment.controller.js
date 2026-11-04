import {
    listPaymentMethodsService,
    initiatePaymentService,
    getPaymentStatusService,
} from "./payment.service.js";
import logger from "../config/logger.js";

const PaymentController = {
    listPaymentMethods: (_req, res) => {
        logger.debug("Listing available payment methods.");
        const data = listPaymentMethodsService();
        return res.status(200).json({
            success: true,
            message: "Payment methods retrieved successfully.",
            data,
        });
    },

    initiatePayment: async (req, res, next) => {
        try {
            const { listing_id, payment_method } = req.body;
            const userId = req.user?.user_id ?? req.user?.id;
            logger.info(
                { userId, listing_id, payment_method },
                "Initiating payment.",
            );

            const data = await initiatePaymentService({
                listing_id,
                payment_method,
                userId,
            });

            logger.info(
                { userId, paymentId: data.payment?.id },
                "Payment initiated successfully.",
            );

            return res.status(201).json({
                success: true,
                message: "Cash on Delivery payment initiated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    getPaymentStatus: async (req, res, next) => {
        try {
            const { paymentId } = req.params;
            const userId = req.user?.user_id ?? req.user?.id;
            logger.debug({ paymentId, userId }, "Checking payment status.");

            const data = await getPaymentStatusService({
                paymentId,
                userId,
            });

            return res.status(200).json({
                success: true,
                message: "Payment status retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const { listPaymentMethods, initiatePayment, getPaymentStatus } =
    PaymentController;

export default PaymentController;
