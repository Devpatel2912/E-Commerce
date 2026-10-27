import {
  createRefundRequest,
  getRefundsByUser,
  getRefundById,
  startRefundProcessing,
} from "./refund.model.js";

function getUserId(req) {
  return req.user?.id ?? req.user?.userId;
}

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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function requestRefund(req, res, next) {
  try {
    const userId = getUserId(req);
    const { payment_id, amount, reason } = req.body;

    if (!isValidId(payment_id)) {
      return res.status(400).json({
        success: false,
        message: "A valid payment_id is required.",
      });
    }

    const refundAmount = Number(amount);

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number.",
      });
    }

    if (
      typeof reason !== "string" ||
      reason.trim().length < 3 ||
      reason.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "reason must contain 3 to 1000 characters.",
      });
    }

    const refund = await createRefundRequest({
      paymentId: payment_id,
      userId,
      amount: refundAmount,
      reason: reason.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Refund request created successfully.",
      data: refund,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRefunds(req, res, next) {
  try {
    const refunds = await getRefundsByUser(getUserId(req));

    return res.status(200).json({
      success: true,
      count: refunds.length,
      data: refunds,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRefundDetails(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await getRefundById(
      req.params.id,
      getUserId(req)
    );

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    next(error);
  }
}

export async function processRefund(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await startRefundProcessing(
      req.params.id,
      getUserId(req)
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
}
