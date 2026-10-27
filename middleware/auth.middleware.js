import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import config from "../config/env.js";

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Access token is required."));
  }

  const token = authorization.slice(7).trim();

  if (!token) {
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
      role: decoded.role || "user",
    };

    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token."));
  }
};

export { authMiddleware, authMiddleware as authenticateToken };
export default authMiddleware;
