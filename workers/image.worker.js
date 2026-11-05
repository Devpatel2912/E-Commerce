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
    const { listingImageId, objectKey } = job.data || {};

    try {
        logger.info(
            {
                jobId: job.id,
                listingImageId,
                objectKey,
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

        //Update image status to PROCESSING
        await updateListingImageProcessing(listingImageId, {
            status: LISTING_IMAGE_STATUS.PROCESSING,
        });

        const imageBuffer = await downloadStorageObjectBuffer(objectKey);

        //Validate image size
        if (
            !imageBuffer ||
            imageBuffer.length === 0 ||
            imageBuffer.length > MAX_IMAGE_SIZE_BYTES
        ) {
            throw new UnrecoverableError("Invalid image file size.");
        }

        //Detect actual image format
        const detectedMime = detectImageMimeFromBytes(imageBuffer);

        if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
            throw new UnrecoverableError(
                "Unsupported or invalid image format.",
            );
        }

        //Update PostgreSQL status to COMPLETED
        const updatedImage = await updateListingImageProcessing(
            listingImageId,
            {
                status: LISTING_IMAGE_STATUS.COMPLETED,
                fileSize: imageBuffer.length,
                contentType: detectedMime,
            },
        );

        if (!updatedImage) {
            throw new Error(
                "Failed to update image processing status in PostgreSQL.",
            );
        }

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
        const maxAttempts = Number(job.opts.attempts || 1);

        //Unrecoverable errors are never retried
        const isFinalAttempt =
            error instanceof UnrecoverableError ||
            job.attemptsMade + 1 >= maxAttempts;

        //Update PostgreSQL status after failure
        if (listingImageId) {
            const nextStatus = isFinalAttempt
                ? LISTING_IMAGE_STATUS.FAILED
                : LISTING_IMAGE_STATUS.PENDING;

            await updateListingImageProcessing(listingImageId, {
                status: nextStatus,
            }).catch((dbError) => {
                logger.error(
                    {
                        err: dbError,
                        listingImageId,
                        jobId: job.id,
                    },
                    "Failed to update image status after job failure",
                );
            });
        }

        if (isFinalAttempt) {
            logger.error(
                {
                    err: error,
                    jobId: job.id,
                    listingImageId,
                    attemptsMade: job.attemptsMade,
                },
                "Image processing failed permanently",
            );
        } else {
            logger.warn(
                {
                    err: error,
                    jobId: job.id,
                    listingImageId,
                    attempt: job.attemptsMade + 1,
                    maxAttempts,
                },
                "Image processing failed. Waiting for retry",
            );
        }

        throw error;
    }
};

const imageWorker = new Worker("image-processing", processImageJob, {
    connection: redisConnection,
    concurrency: 5,
});

imageWorker.on("completed", (job, result) => {
    logger.info(
        {
            jobId: job.id,
            result,
        },
        "Background image job completed",
    );
});

imageWorker.on("failed", (job, error) => {
    const maxAttempts = Number(job?.opts?.attempts || 1);

    const isFinalAttempt =
        !job ||
        error instanceof UnrecoverableError ||
        job.attemptsMade >= maxAttempts;

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
            "Background image job will retry",
        );
    }
});

imageWorker.on("error", (error) => {
    logger.error(
        {
            err: error,
        },
        "Image worker connection error",
    );
});

logger.info("Image background worker started");

let isShuttingDown = false;

const shutdown = async (signal) => {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    logger.info(`${signal} received. Closing image worker...`);

    try {
        await imageWorker.close();

        if (redisConnection.status !== "end") {
            await redisConnection.quit();
        }
        await pool.end();

        logger.info("Image worker shutdown completed");

        process.exit(0);
    } catch (error) {
        logger.error(
            {
                err: error,
            },
            "Image worker shutdown failed",
        );

        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
