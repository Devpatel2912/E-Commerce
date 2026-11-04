import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

const validate = (validator) => (req, _res, next) => {
    const errors = validator(req.body || {});

    if (errors.length > 0) {
        logger.warn(
            {
                requestId: req.id,
                path: req.originalUrl || req.url,
                errors,
            },
            "Request validation failed.",
        );
        return next(new ApiError(400, "Validation failed", errors));
    }

    next();
};

export default validate;
