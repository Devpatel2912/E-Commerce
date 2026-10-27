import {
    createErrorEnvelope,
    getDefaultErrorCode,
    AppError,
    ErrorCodes,
} from "../config/error.js";
import logger from "../config/logger.js";

const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const isJsonSyntaxError =
        err instanceof SyntaxError &&
        (err.status === 400 || err.statusCode === 400 || "body" in err) &&
        (err.message?.includes("JSON") || err.type === "entity.parse.failed");

    const statusCode =
        Number(err.statusCode || err.status) ||
        (isJsonSyntaxError || err instanceof AppError ? 400 : 500);

    const isClientError = statusCode >= 400 && statusCode < 500;
    const isOperational = Boolean(
        err.isOperational || err instanceof AppError || isClientError,
    );
    const requestId = req?.requestId || req?.id || null;

    let errorCode = err.errorCode;
    let message = err.message;
    let errors = err.errors || [];
    let details = err.details || null;

    if (isJsonSyntaxError) {
        errorCode = ErrorCodes.INVALID_JSON || "invalid_json_err";
        message = "Invalid JSON in request body.";
        details = [
            {
                field: "body",
                msg: "Malformed JSON syntax. Please check for syntax errors such as missing commas or quotes.",
            },
        ];
    } else if (!isOperational && statusCode >= 500) {
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

    if (!isOperational || statusCode >= 500) {
        logger.error(
            {
                type: "error",
                requestId,
                statusCode,
                errorCode,
                message,
                err: {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                    code: err.code,
                },
            },
            `Unhandled server error [${statusCode}] [${errorCode}]: ${message}`,
        );
    } else {
        logger.warn(
            {
                type: "client_error",
                requestId,
                statusCode,
                errorCode,
                message,
                details: details || errors,
            },
            `Operational client warning [${statusCode}] [${errorCode}]: ${message}`,
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
