import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import config from "../config/env.js";
import logger from "../config/logger.js";

const authMiddleware = (req, _res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        logger.debug(
            { requestId: req.id, ip: req.ip },
            "Authentication failed: Missing or invalid authorization header.",
        );
        return next(new ApiError(401, "Access token is required."));
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        logger.debug(
            { requestId: req.id, ip: req.ip },
            "Authentication failed: Empty bearer token.",
        );
        return next(new ApiError(401, "Access token is required."));
    }

    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret);

        if (typeof decoded === "string" || !decoded.sub || !decoded.email) {
            throw new Error("Invalid token payload.");
        }

        req.user = {
            id: decoded.sub,
            email: decoded.email,
        };

        logger.debug(
            { requestId: req.id, userId: req.user.id },
            "User authenticated successfully via access token.",
        );

        next();
    } catch (err) {
        logger.warn(
            { requestId: req.id, ip: req.ip, error: err.message },
            "Authentication failed: Invalid or expired access token.",
        );
        next(new ApiError(401, "Invalid or expired access token."));
    }
};

const optionalAuthMiddleware = (req, _res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        return next();
    }

    const token = authorization.slice(7).trim();
    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret);
        if (typeof decoded === "object" && decoded.sub && decoded.email) {
            req.user = {
                id: decoded.sub,
                email: decoded.email,
            };
            logger.debug(
                { requestId: req.id, userId: req.user.id },
                "Optional auth: User identified.",
            );
        }
    } catch {
        req.user = undefined;
    }

    next();
};

export {
    authMiddleware,
    authMiddleware as authenticateToken,
    optionalAuthMiddleware,
};
export default authMiddleware;
