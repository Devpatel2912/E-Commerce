import authMiddleware from "../middleware/auth.middleware.js";
import logger from "../config/logger.js";

export const authenticateUSer = authMiddleware;

export const requiedOwnUser = (req, res, next) => {
    if (!req.user?.id) {
        logger.warn(
            { ip: req.ip },
            "User authorization failed: Not authenticated.",
        );
        return res.status(401).json({
            success: false,
            message: "Authentication is required.",
        });
    }

    if (String(req.user.id) !== String(req.params.id)) {
        logger.warn(
            {
                authenticatedUserId: req.user.id,
                targetUserId: req.params.id,
                ip: req.ip,
            },
            "User forbidden: Attempted to access another user's account.",
        );
        return res.status(403).json({
            success: false,
            message: "You can only access your own account.",
        });
    }

    next();
};
