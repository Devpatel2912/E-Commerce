import {
    getPaymentMethods,
    findPurchasableListing,
    createCashPayment,
    findPaymentForUser,
} from "./payment.model.js";
import { createTransaction } from "../transaction/transaction.model.js";
import ApiError from "../utils/ApiError.js";

export const listPaymentMethodsService = () => {
    return getPaymentMethods();
};

export const initiatePaymentService = async ({
    listing_id,
    payment_method,
    userId,
}) => {
    if (!Number.isSafeInteger(listing_id) || listing_id <= 0) {
        throw new ApiError(400, "listing_id must be a positive integer.");
    }

    if (!["cash", "online"].includes(payment_method)) {
        throw new ApiError(400, 'payment_method must be "cash" or "online".');
    }

    if (payment_method === "online") {
        const error = new ApiError(501, "Online payment is coming soon.");
        error.data = {
            payment_method: "online",
            available: false,
        };
        error.errorCode = "COMING_SOON";
        throw error;
    }

    if (!userId) {
        throw new ApiError(401, "Authenticated user information is missing.");
    }

    const listing = await findPurchasableListing(listing_id);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (String(listing.user_id) === String(userId)) {
        throw new ApiError(400, "You cannot purchase your own listing.");
    }

    if (listing.status && listing.status.toLowerCase() !== "active") {
        throw new ApiError(409, "This listing is not available for purchase.");
    }

    const amount = Number(listing.price);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(409, "This listing has an invalid purchase price.");
    }

    const payment = await createCashPayment({
        userId,
        listingId: listing.listing_id,
        amount,
    });

    await createTransaction({
        paymentId: payment.id,
        transactionType: "purchase",
        amount,
        currency: "INR",
        status: "pending",
    });

    return {
        payment,
        payment_method: "cash",
        instructions: "Pay the seller when the item is delivered or exchanged.",
    };
};

export const getPaymentStatusService = async ({ paymentId, userId }) => {
    if (
        typeof paymentId !== "string" ||
        !/^[a-zA-Z0-9-]{1,64}$/.test(paymentId)
    ) {
        throw new ApiError(400, "Invalid payment ID.");
    }

    if (!userId) {
        throw new ApiError(401, "Authenticated user information is missing.");
    }

    const payment = await findPaymentForUser(paymentId, userId);
    if (!payment) {
        throw new ApiError(404, "Payment not found.");
    }

    return {
        payment_id: payment.id,
        listing_id: payment.listing_id,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.provider,
        status: payment.status,
    };
};
