import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import logger, { baseLogger } from "../config/logger.js";
import {
    createResponseEnvelope,
    createErrorEnvelope,
    ApiResponse,
    getDefaultErrorCode,
} from "../config/error.js";

const SENSITIVE_KEYS = new Set([
    "password",
    "confirm_password",
    "confirmpassword",
    "new_password",
    "old_password",
    "current_password",
    "password_hash",
    "passwordhash",
]);

export const sanitizeData = (data) => {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map(sanitizeData);

    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
        if (
            SENSITIVE_KEYS.has(key.toLowerCase()) ||
            key.toLowerCase().includes("password")
        ) {
            sanitized[key] = "***";
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeData(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

const pinoHttpMiddleware = pinoHttp({
    logger: baseLogger || logger,

    customAttributeKeys: {
        err: "error",
    },

    genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];

        const id =
            typeof incoming === "string" && incoming.length > 0
                ? incoming
                : randomUUID();

        res.setHeader("x-request-id", id);
        req.id = id;
        req.requestId = id;

        return id;
    },

    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) {
            return "error";
        }

        if (res.statusCode >= 400) {
            return "warn";
        }

        return "info";
    },

    customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} ${res.statusCode}`,

    customErrorMessage: (req, res, err) =>
        `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,

    customReceivedMessage: (req) => `Incoming ${req.method} ${req.url}`,

    customProps: (req, res) => ({
        params:
            req.params && Object.keys(req.params).length > 0
                ? req.params
                : undefined,

        query:
            req.query && Object.keys(req.query).length > 0
                ? req.query
                : undefined,

        requestBody:
            req.body && Object.keys(req.body).length > 0
                ? sanitizeData(req.body)
                : undefined,

        responseBody: res.responseBody
            ? sanitizeData(res.responseBody)
            : undefined,
    }),
});

export const httpLogger = (req, res, next) => {
    pinoHttpMiddleware(req, res, () => {
        req.requestId = req.id;
        res.setHeader("x-request-id", req.id);

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.envelope = (
            data = null,
            message = "Operation successful.",
            statusCode = 200,
            meta = {},
        ) => {
            const envelope = createResponseEnvelope({
                statusCode,
                message,
                data,
                requestId: req.id,
                meta,
            });

            res.responseBody = envelope;

            return originalJson(envelope);
        };

        res.json = (body) => {
            let finalBody = body;

            if (
                body &&
                typeof body === "object" &&
                body.errors &&
                body.errors.code
            ) {
                if (!body.errors.request_id) {
                    body.errors.request_id = req.id;
                }
            } else if (body instanceof ApiResponse) {
                finalBody = body.toEnvelope(req);
            } else if (
                body &&
                typeof body === "object" &&
                body.success === false
            ) {
                const statusCode = Number(
                    body.statusCode || res.statusCode || 500,
                );

                finalBody = createErrorEnvelope({
                    statusCode,
                    errorCode:
                        body.errorCode ||
                        body.code ||
                        getDefaultErrorCode(statusCode),
                    message: body.message || "An error occurred.",
                    errors: body.errors || body.details || [],
                    details: body.details,
                    requestId: req.id,
                });
            } else if (
                body &&
                typeof body === "object" &&
                body.success === true
            ) {
                const statusCode = Number(
                    body.statusCode || res.statusCode || 200,
                );

                finalBody = createResponseEnvelope({
                    statusCode,
                    message: body.message || "Operation successful.",
                    data: body.data !== undefined ? body.data : null,
                    requestId: req.id,
                    pagination: body.pagination || null,
                    meta: body.meta,
                });
            } else {
                const statusCode = Number(res.statusCode || 200);

                if (statusCode >= 400) {
                    finalBody = createErrorEnvelope({
                        statusCode,
                        errorCode:
                            body?.errorCode ||
                            body?.code ||
                            getDefaultErrorCode(statusCode),
                        message:
                            typeof body === "string"
                                ? body
                                : body?.message || "An error occurred.",
                        errors: Array.isArray(body) ? body : body?.errors || [],
                        details: body?.details,
                        requestId: req.id,
                    });
                } else {
                    finalBody = createResponseEnvelope({
                        statusCode,
                        message: body?.message || "Operation successful.",
                        data: body !== undefined ? body : null,
                        requestId: req.id,
                    });
                }
            }

            res.responseBody = finalBody;

            return originalJson(finalBody);
        };

        res.send = (chunk) => {
            if (!res.responseBody && chunk) {
                try {
                    res.responseBody =
                        typeof chunk === "string" ? JSON.parse(chunk) : chunk;
                } catch {
                    res.responseBody = chunk;
                }
            }

            return originalSend(chunk);
        };

        next();
    });
};

export default httpLogger;
