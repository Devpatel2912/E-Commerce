import app from "./app.js";
import pool from "./config/db.js";
import config from "./config/env.js";
import logger from "./config/logger.js";
import { getRedisClient } from "./config/redis.js";
import initImageWorker from "./jobs/image.worker.js";

const startServer = async () => {
    try {
        logger.debug("Connecting to PostgreSQL database...");
        await pool.query("SELECT 1");
        logger.info("Connected to PostgreSQL database successfully.");

        logger.debug(
            "Initializing Redis connection & background image worker...",
        );
        const redisClient = getRedisClient();
        await redisClient.ping().catch((err) => {
            logger.warn(
                "Redis ping check warning (worker will retry connection):",
                err.message,
            );
        });

        const imageWorker = initImageWorker();
        logger.info(
            "Background Image Processing Worker initialized successfully.",
        );

        const server = app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port}`);
            logger.info(
                `API base URL: http://localhost:${config.port}${config.apiPrefix}`,
            );
        });

        const shutdown = async (signal) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`);
            await imageWorker.close().catch(() => {});
            await redisClient.quit().catch(() => {});
            server.close(() => {
                pool.end().catch(() => {});
                process.exit(0);
            });
        };

        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
