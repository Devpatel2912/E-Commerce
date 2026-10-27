import {
    listPaymentMethodsService,
    initiatePaymentService,
    getPaymentStatusService,
} from "./payment.service.js";

export function listPaymentMethods(req, res) {
    const data = listPaymentMethodsService();
    return res.status(200).json({
        success: true,
        message: "Payment methods retrieved successfully.",
        data,
    });
}

export async function initiatePayment(req, res, next) {
    try {
        const { listing_id, payment_method } = req.body;
        const userId = req.user?.user_id ?? req.user?.id;

        const data = await initiatePaymentService({
            listing_id,
            payment_method,
            userId,
        });

        return res.status(201).json({
            success: true,
            message: "Cash on Delivery payment initiated successfully.",
            data,
        });
    } catch (error) {
        next(error);
    }
}

export async function getPaymentStatus(req, res, next) {
    try {
        const { paymentId } = req.params;
        const userId = req.user?.user_id ?? req.user?.id;

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
}
