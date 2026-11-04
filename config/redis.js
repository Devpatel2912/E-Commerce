import Redis from "ioredis";
import config from "./env.js";
import logger from "./logger.js";

export const redisConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
        if (!config.redis.enabled) {
            return null;
        }
        return Math.min(times * 2000, 10000);
    },
};

let redisClient = null;
let lastErrorLogTime = 0;
let isConnected = false;

export const getRedisClient = () => {
    if (!config.redis.enabled) {
        return null;
    }

    if (!redisClient) {
        redisClient = new Redis(redisConnectionOptions);

        redisClient.on("connect", () => {
            isConnected = true;
            logger.info("Connected to Redis successfully.");
        });

        redisClient.on("ready", () => {
            isConnected = true;
        });

        redisClient.on("close", () => {
            isConnected = false;
        });

        redisClient.on("end", () => {
            isConnected = false;
        });

        redisClient.on("error", (err) => {
            isConnected = false;
            const now = Date.now();
            if (now - lastErrorLogTime > 60000) {
                lastErrorLogTime = now;
                const errDetail = err?.message || err?.code || String(err);
                logger.warn(
                    `Redis connection notice (${errDetail}). Ensure Redis is running at ${config.redis.host}:${config.redis.port} if background queue is required.`,
                );
            }
        });
    }

    return redisClient;
};

export const checkRedisHealth = async () => {
    if (!config.redis.enabled) {
        isConnected = false;
        return false;
    }

    const client = getRedisClient();
    if (!client) {
        isConnected = false;
        return false;
    }

    try {
        if (client.status === "wait") {
            await client.connect();
        }

        const pong = await Promise.race([
            client.ping(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Redis ping timeout")), 2000),
            ),
        ]);

        isConnected = pong === "PONG";
        return isConnected;
    } catch {
        isConnected = false;
        return false;
    }
};

export const isRedisAvailable = () => isConnected;

export const closeRedisClient = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {
            redisClient.disconnect();
        } finally {
            redisClient = null;
            isConnected = false;
        }
    }
};

export default getRedisClient;
