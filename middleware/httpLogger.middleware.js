import { randomUUID } from "node:crypto";
import logger from "../config/logger.js";
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
    "refreshtoken",
    "accesstoken",
    "token",
    "authorization",
    "secret",
]);

export const sanitizeData = (data) => {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map(sanitizeData);

    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (
            SENSITIVE_KEYS.has(lowerKey) ||
            lowerKey.includes("password") ||
            lowerKey.includes("secret")
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

export const httpLogger = (req, res, next) => {
    const incomingId = req.headers["x-request-id"];
    const requestId =
        typeof incomingId === "string" && incomingId.length > 0
            ? incomingId
            : randomUUID();

    req.id = requestId;
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const startTime = Date.now();

    // Log the incoming request in JSON format
    logger.info(
        {
            type: "request",
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            ip: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers["user-agent"],
            query:
                req.query && Object.keys(req.query).length > 0
                    ? req.query
                    : undefined,
            params:
                req.params && Object.keys(req.params).length > 0
                    ? req.params
                    : undefined,
            body:
                req.body && Object.keys(req.body).length > 0
                    ? sanitizeData(req.body)
                    : undefined,
        },
        `Incoming Request: ${req.method} ${req.originalUrl || req.url}`,
    );

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
            requestId,
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
                body.errors.request_id = requestId;
            }
        } else if (body instanceof ApiResponse) {
            finalBody = body.toEnvelope(req);
        } else if (body && typeof body === "object" && body.success === false) {
            const statusCode = Number(body.statusCode || res.statusCode || 500);

            finalBody = createErrorEnvelope({
                statusCode,
                errorCode:
                    body.errorCode ||
                    body.code ||
                    getDefaultErrorCode(statusCode),
                message: body.message || "An error occurred.",
                errors: body.errors || body.details || [],
                details: body.details,
                requestId,
            });
        } else if (body && typeof body === "object" && body.success === true) {
            const statusCode = Number(body.statusCode || res.statusCode || 200);

            finalBody = createResponseEnvelope({
                statusCode,
                message: body.message || "Operation successful.",
                data: body.data !== undefined ? body.data : null,
                requestId,
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
                    requestId,
                });
            } else {
                finalBody = createResponseEnvelope({
                    statusCode,
                    message: body?.message || "Operation successful.",
                    data: body !== undefined ? body : null,
                    requestId,
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

    // Log the outgoing response in JSON format upon completion
    res.on("finish", () => {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        const responseLog = {
            type: "response",
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode,
            durationMs,
            body: res.responseBody ? sanitizeData(res.responseBody) : undefined,
        };

        const summary = `Outgoing Response: ${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms)`;

        if (statusCode >= 500) {
            logger.error(responseLog, summary);
        } else if (statusCode >= 400) {
            logger.warn(responseLog, summary);
        } else {
            logger.info(responseLog, summary);
        }
    });

    next();
};

export default httpLogger;
