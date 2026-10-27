export const registerValidator = (body) => {
    const errors = [];

    if (typeof body.name !== "string" || !body.name.trim()) {
        errors.push("Name is required.");
    } else if (body.name.trim().length > 100) {
        errors.push("Name must not exceed 100 characters.");
    }

    if (
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
        errors.push("A valid email address is required.");
    }

    if (
        typeof body.password !== "string" ||
        body.password.length < 8 ||
        body.password.length > 72
    ) {
        errors.push("Password must be between 8 and 72 bytes/characters.");
    } else if (Buffer.byteLength(body.password, "utf8") > 72) {
        errors.push("Password must not exceed 72 UTF-8 bytes.");
    }

    return errors;
};

export const loginValidator = (body) => {
    const errors = [];

    if (
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
        errors.push("A valid email address is required.");
    }

    if (
        typeof body.password !== "string" ||
        body.password.length === 0 ||
        Buffer.byteLength(body.password, "utf8") > 72
    ) {
        errors.push("A valid password is required.");
    }

    return errors;
};
