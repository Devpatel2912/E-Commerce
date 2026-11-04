import app from "./app.js";
import pool from "./config/db.js";
import config from "./config/env.js";
import logger from "./config/logger.js";
import { checkRedisHealth, closeRedisClient } from "./config/redis.js";
import initImageWorker from "./jobs/image.worker.js";

const startServer = async () => {
    try {
        logger.debug("Connecting to PostgreSQL database...");
        await pool.query("SELECT 1");
        logger.info("Connected to PostgreSQL database successfully.");

        let imageWorker = null;
        if (config.redis.enabled) {
            logger.debug(
                "Checking Redis connection & background image worker...",
            );
            const isRedisHealthy = await checkRedisHealth();
            if (isRedisHealthy) {
                imageWorker = initImageWorker();
                if (imageWorker) {
                    logger.info(
                        "Background Image Processing Worker initialized successfully.",
                    );
                }
            } else {
                logger.warn(
                    `Redis is not running at ${config.redis.host}:${config.redis.port}. Direct in-memory image processing will be used as fallback. (To enable Redis: run "docker compose up -d redis")`,
                );
            }
        } else {
            logger.info(
                "Redis is disabled. Direct in-memory image processing will be used.",
            );
        }

        const server = app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port}`);
            logger.info(
                `API base URL: http://localhost:${config.port}${config.apiPrefix}`,
            );
        });

        const shutdown = async (signal) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`);
            if (imageWorker) {
                await imageWorker.close().catch(() => {});
            }
            await closeRedisClient().catch(() => {});
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
