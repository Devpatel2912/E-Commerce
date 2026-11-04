import app from "./app.js";
import pool from "./config/db.js";
import config from "./config/env.js";
import logger from "./config/logger.js";

const startServer = async () => {
    try {
        logger.debug("Connecting to PostgreSQL database...");
        await pool.query("SELECT 1");
        logger.info("Connected to PostgreSQL database successfully.");

        const server = app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port}`);
            logger.info(
                `API base URL: http://localhost:${config.port}${config.apiPrefix}`,
            );
        });

        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                logger.error(
                    `Port ${config.port} is already in use! A container (such as Docker 'e-commerce-backend') or another process is already occupying this port.`,
                );
            } else {
                logger.error("HTTP Server encountered an error:", err);
            }
            process.exit(1);
        });

        const shutdown = async (signal) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(() => {
                pool.end().catch(() => {});
                process.exit(0);
            });
        };

        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));

        process.on("unhandledRejection", (reason) => {
            logger.error({ reason }, "Unhandled Promise Rejection detected.");
        });

        process.on("uncaughtException", (error) => {
            logger.error({ error }, "Uncaught Exception detected.");
            process.exit(1);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
