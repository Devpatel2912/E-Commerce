import ApiError from "../utils/ApiError.js";

const parsePositiveInt = (val) => {
  if (!/^[1-9]\d*$/.test(String(val ?? ""))) return null;
  const num = Number(val);
  return Number.isSafeInteger(num) ? num : null;
};

export const validateAdminIdParam = (req, res, next) => {
  const id = parsePositiveInt(req.params.id);

  if (!id) {
    return next(new ApiError(400, "Invalid ID parameter. Must be a positive integer."));
  }

  req.validatedId = id;
  next();
};

export const validateAdminPagination = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
};

export const validateEditUser = (req, res, next) => {
  const { name, email, role } = req.body;

  if (name === undefined && email === undefined && role === undefined) {
    return next(
      new ApiError(400, "At least one field (name, email, or role) must be provided to update.")
    );
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return next(new ApiError(400, "Name must be between 2 and 100 characters."));
    }
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email.trim())) {
      return next(new ApiError(400, "A valid email address is required."));
    }
  }

  if (role !== undefined) {
    const allowedRoles = ["user", "admin"];
    if (typeof role !== "string" || !allowedRoles.includes(role.trim().toLowerCase())) {
      return next(
        new ApiError(400, `Invalid role. Allowed values are: ${allowedRoles.join(", ")}`)
      );
    }
  }

  req.validatedUserUpdate = {
    name: name !== undefined ? name.trim() : undefined,
    email: email !== undefined ? email.trim().toLowerCase() : undefined,
    role: role !== undefined ? role.trim().toLowerCase() : undefined,
  };

  next();
};

export const validateIssueRefund = (req, res, next) => {
  const { payment_id, amount, reason, status } = req.body;

  const paymentId = parsePositiveInt(payment_id);
  if (!paymentId) {
    return next(new ApiError(400, "A valid positive integer payment_id is required."));
  }

  const refundAmount = Number(amount);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return next(new ApiError(400, "amount must be a positive number greater than 0."));
  }

  if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 1000)) {
    return next(new ApiError(400, "reason must not exceed 1000 characters."));
  }

  const allowedStatuses = [
    "requested",
    "pending",
    "processing",
    "completed",
    "succeeded",
    "failed",
    "rejected",
  ];

  if (
    status !== undefined &&
    (!allowedStatuses.includes(String(status).toLowerCase()))
  ) {
    return next(
      new ApiError(
        400,
        `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
      )
    );
  }

  req.validatedRefund = {
    paymentId,
    amount: refundAmount,
    reason: reason ? reason.trim() : "Admin issued refund",
    status: status ? String(status).toLowerCase() : "completed",
  };

  next();
};

export const validateUpdateRefundStatus = (req, res, next) => {
  const { status, reason, provider_refund_id } = req.body;

  const allowedStatuses = [
    "requested",
    "pending",
    "processing",
    "completed",
    "succeeded",
    "failed",
    "rejected",
  ];

  if (!status || !allowedStatuses.includes(String(status).toLowerCase())) {
    return next(
      new ApiError(
        400,
        `Valid status is required. Allowed values: ${allowedStatuses.join(", ")}`
      )
    );
  }

  req.validatedStatusUpdate = {
    status: String(status).toLowerCase(),
    reason: typeof reason === "string" ? reason.trim() : null,
    providerRefundId:
      typeof provider_refund_id === "string" ? provider_refund_id.trim() : null,
  };

  next();
};
