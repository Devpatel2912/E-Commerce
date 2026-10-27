import {
    createRefundRequest,
    getRefundsByUser,
    getRefundById,
    startRefundProcessing,
} from "./refund.model.js";
import ApiError from "../utils/ApiError.js";

function isValidId(value) {
    if (
        (typeof value === "number" || typeof value === "string") &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) > 0
    ) {
        return true;
    }
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
}

export const requestRefundService = async ({
    userId,
    payment_id,
    amount,
    reason,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!isValidId(payment_id)) {
        throw new ApiError(400, "A valid payment_id is required.");
    }

    const refundAmount = Number(amount);
    if (
        amount === undefined ||
        amount === null ||
        amount === "" ||
        !Number.isFinite(refundAmount) ||
        refundAmount <= 0
    ) {
        throw new ApiError(400, "amount must be a positive number.");
    }

    if (
        typeof reason !== "string" ||
        reason.trim().length < 3 ||
        reason.trim().length > 1000
    ) {
        throw new ApiError(400, "reason must contain 3 to 1000 characters.");
    }

    const refund = await createRefundRequest({
        paymentId: payment_id,
        userId,
        amount: refundAmount,
        reason: reason.trim(),
    });

    return refund;
};

export const listRefundsService = async (userId) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    return await getRefundsByUser(userId);
};

export const getRefundDetailsService = async ({ id, userId }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!isValidId(id)) {
        throw new ApiError(400, "Invalid refund ID.");
    }

    const refund = await getRefundById(id, userId);
    if (!refund) {
        throw new ApiError(404, "Refund not found.");
    }

    return refund;
};

export const processRefundService = async ({ id, userId }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!isValidId(id)) {
        throw new ApiError(400, "Invalid refund ID.");
    }

    const refund = await startRefundProcessing(id, userId);
    if (!refund) {
        throw new ApiError(404, "Refund not found or cannot be processed.");
    }

    return refund;
};
