import { Worker, UnrecoverableError } from "bullmq";

import redisConnection from "../queue/redis.js";
import logger from "../config/logger.js";

import pool from "../config/db.js";

import {
    downloadStorageObjectBuffer,
    detectImageMimeFromBytes,
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_IMAGE_SIZE_BYTES,
} from "../config/storage.js";

import {
    getListingImageById,
    updateListingImageProcessing,
} from "../listing-image/listing-image.model.js";

import { LISTING_IMAGE_STATUS } from "../constants/status.constants.js";

const processImageJob = async (job) => {
    const { listingImageId, objectKey } = job.data;

    try {
        logger.info(
            {
                jobId: job.id,
                listingImageId,
            },
            "Image processing started",
        );

        //Validate job data
        if (!listingImageId || !objectKey) {
            throw new UnrecoverableError("Invalid image job data.");
        }

        //Get image record from PostgreSQL
        const image = await getListingImageById(listingImageId);

        if (!image) {
            throw new UnrecoverableError("Listing image record not found.");
        }

        //Verify object key
        if (image.object_key !== objectKey) {
            throw new UnrecoverableError(
                "Image object key does not match database record.",
            );
        }

        //Update image status
        await updateListingImageProcessing(listingImageId, {
            status: LISTING_IMAGE_STATUS.PROCESSING,
        });

        //Download original image from Neon Object Storage
        const imageBuffer = await downloadStorageObjectBuffer(objectKey);

        //Validate image size
        if (
            imageBuffer.length === 0 ||
            imageBuffer.length > MAX_IMAGE_SIZE_BYTES
        ) {
            await updateListingImageProcessing(listingImageId, {
                status: LISTING_IMAGE_STATUS.FAILED,
            });

            throw new UnrecoverableError("Invalid image file size.");
        }

        //Detect actual image format
        const detectedMime = detectImageMimeFromBytes(imageBuffer);

        if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
            await updateListingImageProcessing(listingImageId, {
                status: LISTING_IMAGE_STATUS.FAILED,
            });

            throw new UnrecoverableError(
                "Unsupported or invalid image format.",
            );
        }

        //Update PostgreSQL after successful processing
        const updatedImage = await updateListingImageProcessing(
            listingImageId,
            {
                status: LISTING_IMAGE_STATUS.COMPLETED,
                fileSize: imageBuffer.length,
                contentType: detectedMime,
            },
        );

        logger.info(
            {
                jobId: job.id,
                listingImageId,
                fileSize: imageBuffer.length,
                contentType: detectedMime,
            },
            "Image processing completed successfully",
        );

        return {
            success: true,
            imageId: updatedImage.image_id,
            status: updatedImage.status,
        };
    } catch (error) {
        // Permanent validation errors should not be retried
        if (error instanceof UnrecoverableError) {
            throw error;
        }

        const maxAttempts = Number(job.opts.attempts || 1);
        const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

        if (isFinalAttempt) {
            await updateListingImageProcessing(listingImageId, {
                status: LISTING_IMAGE_STATUS.FAILED,
            }).catch((dbError) => {
                logger.error(
                    { err: dbError, listingImageId },
                    "Failed to update image status after final attempt",
                );
            });

            logger.error(
                {
                    err: error,
                    jobId: job.id,
                    listingImageId,
                },
                "Image processing failed permanently",
            );
        }

        throw error;
    }
};

// Create background worker
const imageWorker = new Worker("image-processing", processImageJob, {
    connection: redisConnection,
    concurrency: 5,
});

// Job completed
imageWorker.on("completed", (job, result) => {
    logger.info(
        {
            jobId: job.id,
            result,
        },
        "Background image job completed",
    );
});

// Job failed or waiting for retry
imageWorker.on("failed", (job, error) => {
    const maxAttempts = Number(job?.opts?.attempts || 1);
    const isFinalAttempt =
        !job ||
        job.attemptsMade >= maxAttempts ||
        error instanceof UnrecoverableError;

    if (isFinalAttempt) {
        logger.error(
            {
                err: error,
                jobId: job?.id,
            },
            "Background image job failed",
        );
    } else {
        logger.warn(
            {
                err: error,
                jobId: job.id,
                attemptsMade: job.attemptsMade,
                maxAttempts,
            },
            "Image job failed. Waiting for retry",
        );
    }
});

// Worker connection error
imageWorker.on("error", (error) => {
    logger.error({ err: error }, "Image worker connection error");
});

// Worker started
logger.info("Image background worker started");

// Graceful shutdown
let isShuttingDown = false;

const shutdown = async (signal) => {
    if (isShuttingDown) return;

    isShuttingDown = true;

    logger.info(`${signal} received. Closing image worker...`);

    try {
        await imageWorker.close();
        await pool.end();

        logger.info("Image worker shutdown completed");
        process.exit(0);
    } catch (error) {
        logger.error({ err: error }, "Image worker shutdown failed");

        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
