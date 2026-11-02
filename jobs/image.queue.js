import { Queue } from "bullmq";
import config from "../config/env.js";
import { redisConnectionOptions } from "../config/redis.js";
import logger from "../config/logger.js";

export const IMAGE_QUEUE_NAME = "image-processing";

export const imageProcessingQueue = new Queue(IMAGE_QUEUE_NAME, {
    connection: redisConnectionOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});

let lastQueueErrorTime = 0;

imageProcessingQueue.on("error", (err) => {
    const now = Date.now();
    if (now - lastQueueErrorTime > 10000) {
        lastQueueErrorTime = now;
        const errDetail = err?.message || err?.code || String(err);
        logger.error(
            `Image processing queue error (${errDetail}). Ensure Redis is running on ${config.redis.host}:${config.redis.port}.`,
        );
    }
});
export const enqueueImageProcessingJob = async ({
    listingId,
    objectKey,
    isPrimary = false,
    userId,
    imageId = null,
}) => {
    try {
        const job = await imageProcessingQueue.add(
            "process-image",
            {
                listingId: Number(listingId),
                objectKey,
                isPrimary: Boolean(isPrimary),
                userId,
                imageId,
            },
            {
                jobId: `img_${listingId}_${Date.now()}`,
            },
        );

        logger.info(
            `Enqueued image processing job ${job.id} for listing ${listingId} (objectKey: ${objectKey})`,
        );
        return job;
    } catch (error) {
        logger.error(
            `Failed to enqueue image processing job for listing ${listingId}:`,
            error?.message || error,
        );
        throw error;
    }
};

export default imageProcessingQueue;
