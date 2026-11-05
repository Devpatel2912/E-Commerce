import IORedis from "ioredis";

const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),

    maxRetriesPerRequest: null,
});

export default redisConnection;
