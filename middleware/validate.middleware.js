import ApiError from "../utils/ApiError.js";

const validate = (validator) => (req, res, next) => {
    const errors = validator(req.body || {});

    if (errors.length > 0) {
        return next(new ApiError(400, "Validation failed", errors));
    }

    next();
};

export default validate;
