import {
    createErrorEnvelope,
    getDefaultErrorCode,
    extractFieldFromMessage,
    AppError,
    ErrorCodes,
} from "../config/error.js";
import logger from "../config/logger.js";

const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const requestId = req?.requestId || req?.id || null;
    const method = req?.method || "UNKNOWN";
    const url = req?.originalUrl || req?.url || "";

    const isJsonSyntaxError =
        err instanceof SyntaxError &&
        (err.status === 400 || err.statusCode === 400 || "body" in err) &&
        (err.message?.includes("JSON") || err.type === "entity.parse.failed");

    const isMulterError = err?.name === "MulterError";
    const isPgError =
        typeof err?.code === "string" && /^[0-9A-Z]{5}$/.test(err.code);

    let statusCode = Number(err.statusCode || err.status);
    let errorCode = err.errorCode;
    let message = err.message;
    let errors = err.errors || [];
    let details = err.details || null;
    let isOperational = Boolean(err.isOperational || err instanceof AppError);

    if (isJsonSyntaxError) {
        statusCode = 400;
        isOperational = true;
        errorCode = ErrorCodes.INVALID_JSON || "invalid_json_err";
        message = "Invalid JSON in request body.";
        details = [
            {
                field: "body",
                msg: "Malformed JSON syntax. Please check for syntax errors such as missing commas or quotes.",
            },
        ];
    } else if (isMulterError) {
        statusCode = 400;
        isOperational = true;
        if (err.code === "LIMIT_FILE_SIZE") {
            errorCode = ErrorCodes.FILE_TOO_LARGE || "file_too_large_err";
            message = "File size exceeds the 5MB limit.";
            details = [
                { field: "images", msg: "File size exceeds the 5MB limit." },
            ];
        } else if (
            err.code === "LIMIT_FILE_COUNT" ||
            err.code === "LIMIT_UNEXPECTED_FILE"
        ) {
            errorCode = ErrorCodes.FILE_UPLOAD_FAILED || "file_upload_err";
            message = "Maximum image count exceeded or unexpected field.";
            details = [{ field: err.field || "images", msg: err.message }];
        } else {
            errorCode = ErrorCodes.FILE_UPLOAD_FAILED || "file_upload_err";
            message = err.message || "File upload error.";
            details = [{ field: err.field || "images", msg: err.message }];
        }
    } else if (isPgError) {
        if (err.code === "23503") {
            statusCode = 400;
            isOperational = true;
            errorCode = ErrorCodes.DB_FOREIGN_KEY_VIOLATION || "db_fk_err";
            const field = extractFieldFromMessage(
                err.detail || err.constraint || "category_id",
            );
            message = `Referenced ${field} does not exist.`;
            details = [
                {
                    field,
                    msg: `The provided ${field} does not exist.`,
                },
            ];
        } else if (err.code === "23505") {
            statusCode = 409;
            isOperational = true;
            errorCode = ErrorCodes.CONFLICT || "conflict_err";
            message = "Resource with this value already exists.";
            details = [
                {
                    field: extractFieldFromMessage(err.detail || ""),
                    msg: "A duplicate record already exists.",
                },
            ];
        } else if (err.code === "23514") {
            statusCode = 400;
            isOperational = true;
            errorCode = ErrorCodes.BAD_REQUEST || "bad_request_err";
            message = "Database constraint check failed.";
        } else if (err.code === "22P02") {
            statusCode = 400;
            isOperational = true;
            errorCode = ErrorCodes.BAD_REQUEST || "bad_request_err";
            message = "Invalid input syntax or data type.";
        } else {
            statusCode = statusCode || 500;
        }
    }

    if (!statusCode) {
        statusCode = err instanceof AppError ? 400 : 500;
    }

    const isClientError = statusCode >= 400 && statusCode < 500;
    if (isClientError) {
        isOperational = true;
    }

    if (!isOperational && statusCode >= 500) {
        errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
        message =
            process.env.NODE_ENV === "production"
                ? "Internal server error."
                : err.message || "Internal server error.";
    } else {
        if (!errorCode) {
            errorCode = getDefaultErrorCode(statusCode);
        }
        if (!message) {
            message = isOperational
                ? "Client error occurred."
                : "Internal server error.";
        }
    }

    // Detailed server-side logging without leaking internal queries or secrets to response
    if (!isOperational || statusCode >= 500) {
        logger.error(
            {
                type: "error",
                requestId,
                method,
                url,
                statusCode,
                errorCode,
                message,
                dbCode: isPgError ? err.code : undefined,
                dbConstraint: err?.constraint,
                dbTable: err?.table,
                dbDetail: err?.detail,
                err: {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                    code: err.code,
                },
            },
            `Unhandled server error [${method} ${url}] [${statusCode}] [${errorCode}]: ${message}`,
        );
    } else {
        logger.warn(
            {
                type: "client_error",
                requestId,
                method,
                url,
                statusCode,
                errorCode,
                message,
                details: details || errors,
            },
            `Client error [${method} ${url}] [${statusCode}] [${errorCode}]: ${message}`,
        );
    }

    const errorEnvelope = createErrorEnvelope({
        statusCode,
        errorCode,
        message,
        errors,
        details,
        data: err.data || null,
        requestId,
    });

    return res.status(statusCode).json(errorEnvelope);
};

export default errorMiddleware;
