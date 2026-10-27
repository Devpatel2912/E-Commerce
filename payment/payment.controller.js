import {
  getPaymentMethods,
  findPurchasableListing,
  createCashPayment,
  findPaymentForUser,
} from "./payment.model.js";
import { createTransaction } from "../transaction/transaction.model.js";

export function listPaymentMethods(req, res) {
  return res.status(200).json({
    success: true,
    message: "Payment methods retrieved successfully.",
    data: getPaymentMethods(),
  });
}

export async function initiatePayment(req, res, next) {
  try {
    const { listing_id, payment_method } = req.body;

    if (!Number.isSafeInteger(listing_id) || listing_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "listing_id must be a positive integer.",
      });
    }

    if (!["cash", "online"].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'payment_method must be "cash" or "online".',
      });
    }

    if (payment_method === "online") {
      return res.status(501).json({
        success: false,
        code: "COMING_SOON",
        message: "Online payment is coming soon.",
        data: {
          payment_method: "online",
          available: false,
        },
      });
    }

    const userId = req.user?.user_id ?? req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing.",
      });
    }

    const listing = await findPurchasableListing(listing_id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    if (String(listing.user_id) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot purchase your own listing.",
      });
    }

    if (listing.status && listing.status.toLowerCase() !== "active") {
      return res.status(409).json({
        success: false,
        message: "This listing is not available for purchase.",
      });
    }

    const amount = Number(listing.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(409).json({
        success: false,
        message: "This listing has an invalid purchase price.",
      });
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

    return res.status(201).json({
      success: true,
      message: "Cash on Delivery payment initiated successfully.",
      data: {
        payment,
        payment_method: "cash",
        instructions: "Pay the seller when the item is delivered or exchanged.",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentStatus(req, res, next) {
  try {
    const { paymentId } = req.params;

    if (
      typeof paymentId !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(paymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const userId = req.user?.user_id ?? req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing.",
      });
    }

    const payment = await findPaymentForUser(paymentId, userId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status retrieved successfully.",
      data: {
        payment_id: payment.id,
        listing_id: payment.listing_id,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.provider,
        status: payment.status,
      },
    });
  } catch (error) {
    next(error);
  }
}
