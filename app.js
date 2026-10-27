import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import config from "./config/env.js";
import apiRoutes from "./routes/index.js";
import ApiError from "./utils/ApiError.js";
import { ErrorCodes } from "./config/error.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { httpLogger } from "./middleware/httpLogger.middleware.js";
import { globalLimiter } from "./middleware/rateLimiter.middleware.js";

const app = express();

app.disable("x-powered-by");

app.use(
    cors({
        origin: config.corsOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: [
            "Retry-After",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
        ],
        credentials: true,
    }),
);

app.set("trust proxy", config.trustProxy);

app.use(httpLogger);
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
    res.json({ message: "Welcome!" });
});

app.get("/health", (_req, res) => {
    res.json({
        success: true,
        message: "Ecommerce API is running.",
    });
});

app.get("/api/v1/health", (_req, res) => {
    res.json({
        success: true,
        message: "Ecommerce API is running.",
    });
});

app.use("/api/v1", globalLimiter, apiRoutes);

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use((req, res, next) => {
    next(
        new ApiError(404, "API route not found.", {
            errorCode: ErrorCodes.ROUTE_NOT_FOUND,
        }),
    );
});

app.use(errorMiddleware);

export default app;
