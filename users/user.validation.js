const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUpdateUser = (req, res, next) => {
    const { name, email } = req.body ?? {};
    const allowedFields = ["name", "email"];

    const unknownFields = Object.keys(req.body ?? {}).filter(
        (key) => !allowedFields.includes(key),
    );

    if (unknownFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid fields in request body.",
            errors: unknownFields,
        });
    }

    if (name === undefined && email === undefined) {
        return res.status(400).json({
            success: false,
            message: "At least one field (name or email) is required.",
        });
    }

    if (name !== undefined) {
        if (
            typeof name !== "string" ||
            name.trim().length < 2 ||
            name.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 2 and 100 characters.",
            });
        }

        req.body.name = name.trim();
    }

    if (email !== undefined) {
        if (
            typeof email !== "string" ||
            email.trim().length > 254 ||
            !emailRegex.test(email.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        req.body.email = email.trim().toLowerCase();
    }

    next();
};

export const validateUserId = (req, res, next) => {
    if (typeof req.params.id !== "string" || req.params.id.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "A valid user ID is required.",
        });
    }

    next();
};

export const validatePagination = (req, res, next) => {
    const { page = "1", limit = "10" } = req.query;

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (
        !/^\d+$/.test(String(page)) ||
        !/^\d+$/.test(String(limit)) ||
        !Number.isSafeInteger(parsedPage) ||
        !Number.isSafeInteger(parsedLimit) ||
        parsedPage < 1 ||
        parsedLimit < 1 ||
        parsedLimit > 100
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Page must be positive and limit must be between 1 and 100.",
        });
    }

    req.pagination = {
        page: parsedPage,
        limit: parsedLimit,
        offset: (parsedPage - 1) * parsedLimit,
    };

    next();
};
