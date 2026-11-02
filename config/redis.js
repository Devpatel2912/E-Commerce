import Redis from "ioredis";
import config from "./env.js";
import logger from "./logger.js";

export const redisConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
        return Math.min(times * 2000, 10000);
    },
};

let redisClient = null;
let lastErrorLogTime = 0;

export const getRedisClient = () => {
    if (!redisClient) {
        redisClient = new Redis(redisConnectionOptions);

        redisClient.on("connect", () => {
            logger.info("Connected to Redis successfully.");
        });

        redisClient.on("error", (err) => {
            const now = Date.now();
            if (now - lastErrorLogTime > 10000) {
                lastErrorLogTime = now;
                const errDetail = err?.message || err?.code || String(err);
                logger.error(
                    `Redis connection error (${errDetail}). Please ensure Redis is running at ${config.redis.host}:${config.redis.port}. (Tip: run "docker compose up -d redis")`,
                );
            }
        });
    }
    return redisClient;
};

export default getRedisClient;
