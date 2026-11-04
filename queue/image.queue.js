import { Queue } from "bullmq";
import redisConnection from "./redis.js";
import logger from "../config/logger.js";

export const imageQueue = new Queue("image-processing", {
    connection: redisConnection,

    defaultJobOptions: {
        attempts: 3,

        backoff: {
            type: "exponential",
            delay: 1000,
        },

        removeOnComplete: 1000,
        removeOnFail: 5000,
    },
});

imageQueue.on("error", (error) => {
    logger.error({ err: error }, "Image queue connection error");
});

logger.info("Image processing queue initialized");
