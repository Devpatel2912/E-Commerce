import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

import { ErrorCodes } from "../config/error.js";

const rateLimitErrorHandler = (req, res, next, options) => {
  next(
    new ApiError(
      options.statusCode || 429,
      typeof options.message === "string"
        ? options.message
        : "Too many requests, please try again later.",
      { errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED },
    ),
  );
};

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later.",
  skipSuccessfulRequests = false,
} = {}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message,
    handler: rateLimitErrorHandler,
  });
};

export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Too many authentication attempts from this IP, please try again after 15 minutes.",
});
