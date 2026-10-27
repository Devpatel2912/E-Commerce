import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";

export const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return next(new ApiError(401, "Authentication is required."));
        }

        if (req.user?.role === "admin") {
            return next();
        }

        const result = await pool.query(
            `SELECT role FROM users WHERE id = $1 LIMIT 1`,
            [userId],
        );

        if (result.rowCount === 0) {
            return next(new ApiError(404, "User account not found."));
        }

        const currentRole = result.rows[0].role;

        if (currentRole !== "admin") {
            return next(
                new ApiError(
                    403,
                    "Access denied. Administrator privileges required.",
                ),
            );
        }

        req.user.role = currentRole;
        next();
    } catch (error) {
        next(error);
    }
};

export default requireAdmin;
