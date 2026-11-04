import { Queue } from "bullmq";
import config from "../config/env.js";
import { redisConnectionOptions, isRedisAvailable } from "../config/redis.js";
import logger from "../config/logger.js";
import { processImageDirect } from "./image.worker.js";

export const IMAGE_QUEUE_NAME = "image-processing";

let queueInstance = null;
let lastQueueErrorTime = 0;

export const getImageQueue = () => {
    if (!config.redis.enabled) {
        return null;
    }

    if (!queueInstance) {
        queueInstance = new Queue(IMAGE_QUEUE_NAME, {
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

        queueInstance.on("error", (err) => {
            const now = Date.now();
            if (now - lastQueueErrorTime > 60000) {
                lastQueueErrorTime = now;
                const errDetail = err?.message || err?.code || String(err);
                logger.warn(
                    `[ImageQueue] Queue connection notice (${errDetail}). Ensure Redis is running on ${config.redis.host}:${config.redis.port}.`,
                );
            }
        });
    }

    return queueInstance;
};

export const enqueueImageProcessingJob = async ({
    listingId,
    objectKey,
    isPrimary = false,
    userId,
    imageId = null,
}) => {
    const jobData = {
        listingId: Number(listingId),
        objectKey,
        isPrimary: Boolean(isPrimary),
        userId,
        imageId,
    };

    if (config.redis.enabled && isRedisAvailable()) {
        try {
            const queue = getImageQueue();
            if (queue) {
                const job = await queue.add("process-image", jobData, {
                    jobId: `img_${listingId}_${Date.now()}`,
                });

                logger.info(
                    `Enqueued image processing job ${job.id} for listing ${listingId} (objectKey: ${objectKey})`,
                );
                return job;
            }
        } catch (error) {
            logger.warn(
                `Failed to enqueue image processing job to Redis queue (${error?.message}). Falling back to direct in-memory processing.`,
            );
        }
    }

    // Direct background processing fallback when Redis is offline or disabled
    logger.info(
        `[Fallback] Processing image directly in background for listing ${listingId} (objectKey: ${objectKey})`,
    );

    setImmediate(async () => {
        try {
            await processImageDirect(jobData);
        } catch (err) {
            logger.error(
                `[Fallback] Direct image processing failed for listing ${listingId}:`,
                err?.message || err,
            );
        }
    });

    return {
        id: `direct_${listingId}_${Date.now()}`,
    };
};

export default getImageQueue;
