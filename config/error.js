export const ErrorCodes = Object.freeze({
  BAD_REQUEST: "bad_request_err",
  UNAUTHORIZED: "unauthorized_err",
  FORBIDDEN: "forbidden_err",
  NOT_FOUND: "not_found_err",
  ROUTE_NOT_FOUND: "route_not_found_err",
  METHOD_NOT_ALLOWED: "method_not_allowed_err",
  CONFLICT: "conflict_err",
  UNPROCESSABLE_ENTITY: "unprocessable_entity_err",
  TOO_MANY_REQUESTS: "rate_limit_err",
  RATE_LIMIT_EXCEEDED: "rate_limit_err",
  INTERNAL_SERVER_ERROR: "internal_server_err",
  SERVICE_UNAVAILABLE: "service_unavailable_err",

  AUTH_UNAUTHORIZED: "unauthorized_err",
  AUTH_FORBIDDEN: "forbidden_err",
  AUTH_TOKEN_MISSING: "token_missing_err",
  AUTH_TOKEN_INVALID: "token_invalid_err",
  AUTH_TOKEN_EXPIRED: "token_expired_err",
  AUTH_INVALID_CREDENTIALS: "invalid_credentials_err",
  AUTH_USER_NOT_FOUND: "user_not_found_err",
  AUTH_ACCOUNT_DISABLED: "account_disabled_err",
  AUTH_EMAIL_ALREADY_EXISTS: "email_exists_err",

  VALIDATION_ERROR: "validation_err",
  INVALID_JSON: "invalid_json_err",
  INVALID_INPUT: "invalid_input_err",
  INVALID_ID: "invalid_id_err",
  MISSING_REQUIRED_FIELDS: "missing_fields_err",

  RESOURCE_NOT_FOUND: "resource_not_found_err",
  RESOURCE_ALREADY_EXISTS: "resource_exists_err",
  USER_NOT_FOUND: "user_not_found_err",
  PRODUCT_NOT_FOUND: "product_not_found_err",
  CATEGORY_NOT_FOUND: "category_not_found_err",
  ORDER_NOT_FOUND: "order_not_found_err",
  REVIEW_NOT_FOUND: "review_not_found_err",
  IMAGE_NOT_FOUND: "image_not_found_err",
  TRANSACTION_NOT_FOUND: "transaction_not_found_err",

  PAYMENT_FAILED: "payment_failed_err",
  PAYMENT_PENDING: "payment_pending_err",
  REFUND_FAILED: "refund_failed_err",
  TRANSACTION_FAILED: "transaction_failed_err",

  FILE_UPLOAD_FAILED: "file_upload_err",
  FILE_TOO_LARGE: "file_too_large_err",
  INVALID_FILE_TYPE: "invalid_file_type_err",

  DATABASE_ERROR: "database_err",
  DB_UNIQUE_VIOLATION: "db_unique_err",
  DB_FOREIGN_KEY_VIOLATION: "db_fk_err",
});

export const getDefaultErrorCode = (statusCode) => {
  const code = Number(statusCode);
  switch (code) {
    case 400:
      return ErrorCodes.BAD_REQUEST;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 405:
      return ErrorCodes.METHOD_NOT_ALLOWED;
    case 409:
      return ErrorCodes.CONFLICT;
    case 422:
      return ErrorCodes.UNPROCESSABLE_ENTITY;
    case 429:
      return ErrorCodes.RATE_LIMIT_EXCEEDED;
    case 503:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    default:
      return code >= 400 && code < 500
        ? ErrorCodes.BAD_REQUEST
        : ErrorCodes.INTERNAL_SERVER_ERROR;
  }
};

export const extractFieldFromMessage = (msg) => {
  if (typeof msg !== "string") return "general";
  const lower = msg.toLowerCase();

  if (lower.includes("password")) return "password";
  if (lower.includes("email")) return "email";
  if (lower.includes("name") && !lower.includes("filename")) return "name";
  if (lower.includes("filename")) return "filename";
  if (lower.includes("content_type")) return "content_type";
  if (lower.includes("file_size")) return "file_size";
  if (lower.includes("object_key")) return "object_key";
  if (lower.includes("category_id")) return "category_id";
  if (lower.includes("listing_id")) return "listing_id";
  if (lower.includes("title")) return "title";
  if (lower.includes("description")) return "description";
  if (lower.includes("price")) return "price";
  if (lower.includes("condition")) return "condition";
  if (lower.includes("location")) return "location";
  if (lower.includes("status")) return "status";
  if (lower.includes("role")) return "role";
  if (lower.includes("token")) return "token";

  const match = msg.match(/^([a-zA-Z0-9_]+)\b/);
  if (
    match &&
    !["a", "an", "the", "invalid", "missing", "please", "failed"].includes(
      match[1].toLowerCase(),
    )
  ) {
    return match[1].toLowerCase();
  }

  return "general";
};

export const formatErrorDetails = (errors) => {
  if (!errors) return [];
  const list = Array.isArray(errors) ? errors : [errors];

  return list.map((item) => {
    if (typeof item === "object" && item !== null) {
      return {
        field: item.field || item.param || item.path || "general",
        msg: item.msg || item.message || "",
      };
    }
    return {
      field: extractFieldFromMessage(String(item)),
      msg: String(item),
    };
  });
};

export const createErrorEnvelope = ({
  statusCode = 500,
  errorCode,
  message = "An error occurred.",
  errors = [],
  details = null,
  requestId = "",
} = {}) => {
  const resolvedCode = errorCode || getDefaultErrorCode(statusCode);
  const resolvedDetails = details || formatErrorDetails(errors);

  return {
    errors: {
      code: resolvedCode,
      message: String(message),
      request_id: requestId || "",
      details: resolvedDetails,
    },
  };
};

export const createResponseEnvelope = ({
  statusCode = 200,
  message = "Operation successful.",
  data = null,
  requestId = "",
  pagination = null,
  meta = {},
} = {}) => {
  return {
    success: Number(statusCode) < 400,
    statusCode: Number(statusCode),
    message: String(message),
    data: data !== undefined ? data : null,
    request_id: requestId || "",
    ...(pagination ? { pagination } : {}),
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };
};

export class AppError extends Error {
  constructor(statusCode = 500, message = "An error occurred.", options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = Number(statusCode);

    if (Array.isArray(options)) {
      this.errors = options;
      this.errorCode = ErrorCodes.VALIDATION_ERROR;
      this.data = null;
      this.isOperational = true;
    } else if (typeof options === "string") {
      this.errorCode = options;
      this.errors = [];
      this.data = null;
      this.isOperational = true;
    } else if (typeof options === "object" && options !== null) {
      this.errorCode = options.errorCode || getDefaultErrorCode(statusCode);
      this.errors = options.errors || [];
      this.data = options.data || null;
      this.isOperational =
        options.isOperational !== undefined ? options.isOperational : true;
    } else {
      this.errorCode = getDefaultErrorCode(statusCode);
      this.errors = [];
      this.data = null;
      this.isOperational = true;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(
    message = "Bad request",
    errorCode = ErrorCodes.BAD_REQUEST,
    errors = [],
  ) {
    return new AppError(400, message, { errorCode, errors });
  }

  static unauthorized(
    message = "Unauthorized",
    errorCode = ErrorCodes.UNAUTHORIZED,
  ) {
    return new AppError(401, message, { errorCode });
  }

  static forbidden(message = "Forbidden", errorCode = ErrorCodes.FORBIDDEN) {
    return new AppError(403, message, { errorCode });
  }

  static notFound(
    message = "Resource not found",
    errorCode = ErrorCodes.NOT_FOUND,
  ) {
    return new AppError(404, message, { errorCode });
  }

  static conflict(
    message = "Conflict occurred",
    errorCode = ErrorCodes.CONFLICT,
  ) {
    return new AppError(409, message, { errorCode });
  }

  static validation(errors = [], message = "Validation failed") {
    return new AppError(400, message, {
      errorCode: ErrorCodes.VALIDATION_ERROR,
      errors,
    });
  }

  static internal(
    message = "Internal server error",
    errorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
  ) {
    return new AppError(500, message, { errorCode, isOperational: false });
  }
}

export const ApiError = AppError;

export class ApiResponse {
  constructor(
    statusCode = 200,
    message = "Operation successful.",
    data = null,
    meta = {},
  ) {
    this.success = Number(statusCode) < 400;
    this.statusCode = Number(statusCode);
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  toEnvelope(req = null) {
    return createResponseEnvelope({
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      requestId: req?.requestId || req?.id || this.meta?.requestId,
      pagination: this.meta?.pagination,
      meta: this.meta,
    });
  }
}

export default {
  ErrorCodes,
  getDefaultErrorCode,
  extractFieldFromMessage,
  formatErrorDetails,
  createErrorEnvelope,
  createResponseEnvelope,
  AppError,
  ApiError,
  ApiResponse,
};
