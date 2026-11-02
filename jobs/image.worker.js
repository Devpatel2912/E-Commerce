import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { IMAGE_QUEUE_NAME } from "./image.queue.js";
import {
    downloadStorageObjectBuffer,
    uploadBufferToStorage,
} from "../config/storage.js";
import { stripImageMetadata } from "../utils/imageProcessor.js";
import {
    getListingImageByObjectKey,
    createListingImage,
    updateListingImageProcessing,
    countListingImages,
} from "../listing-image/listing-image.model.js";
import {
    updateListingStatus,
    getListingById,
} from "../listing/listing.model.js";
import {
    LISTING_STATUS,
    LISTING_IMAGE_STATUS,
} from "../constants/status.constants.js";
import logger from "../config/logger.js";

export const processImageJob = async (job) => {
    const { listingId, objectKey, isPrimary, imageId } = job.data;
    logger.info(
        `[Worker] Started processing image job ${job.id} for listing ${listingId}`,
    );

    try {
        const rawBuffer = await downloadStorageObjectBuffer(objectKey);
        if (!rawBuffer || rawBuffer.length === 0) {
            throw new Error(
                `Empty image buffer downloaded for key: ${objectKey}`,
            );
        }

        const cleaned = await stripImageMetadata(rawBuffer);

        await uploadBufferToStorage({
            objectKey,
            buffer: cleaned.buffer,
            contentType: cleaned.contentType,
        });

        const totalImagesCount = await countListingImages(listingId);
        const shouldBePrimary =
            totalImagesCount <= 1 ? true : Boolean(isPrimary);

        let finalImageRecord;
        if (imageId) {
            finalImageRecord = await updateListingImageProcessing(imageId, {
                status: LISTING_IMAGE_STATUS.COMPLETED,
                isPrimary: shouldBePrimary,
                fileSize: cleaned.buffer.length,
                contentType: cleaned.contentType,
            });
        } else {
            const existingRecord = await getListingImageByObjectKey(objectKey);
            if (existingRecord) {
                finalImageRecord = await updateListingImageProcessing(
                    existingRecord.image_id,
                    {
                        status: LISTING_IMAGE_STATUS.COMPLETED,
                        isPrimary: shouldBePrimary,
                        fileSize: cleaned.buffer.length,
                        contentType: cleaned.contentType,
                    },
                );
            } else {
                finalImageRecord = await createListingImage({
                    listingId,
                    objectKey,
                    contentType: cleaned.contentType,
                    fileSize: cleaned.buffer.length,
                    isPrimary: shouldBePrimary,
                    status: LISTING_IMAGE_STATUS.COMPLETED,
                });
            }
        }

        const listing = await getListingById(listingId);
        if (
            listing &&
            (listing.status === LISTING_STATUS.PENDING ||
                listing.status === LISTING_STATUS.PROCESSING)
        ) {
            await updateListingStatus(listingId, LISTING_STATUS.ACTIVE);
            logger.info(
                `[Worker] Listing ${listingId} is now ACTIVE and visible to all users.`,
            );
        }

        logger.info(
            `[Worker] Successfully finished image processing for listing ${listingId}`,
        );
        return finalImageRecord;
    } catch (error) {
        logger.error(`[Worker] Error processing image job ${job.id}:`, error);
        if (imageId) {
            await updateListingImageProcessing(imageId, {
                status: LISTING_IMAGE_STATUS.FAILED,
            }).catch(() => {});
        }
        throw error;
    }
};

export const initImageWorker = () => {
    const worker = new Worker(IMAGE_QUEUE_NAME, processImageJob, {
        connection: redisConnectionOptions,
        concurrency: 3,
    });

    let lastWorkerErrorTime = 0;

    worker.on("completed", (job) => {
        logger.info(`[Worker] Job ${job.id} completed successfully.`);
    });

    worker.on("failed", (job, err) => {
        logger.error(`[Worker] Job ${job?.id} failed:`, err?.message || err);
    });

    worker.on("error", (err) => {
        const now = Date.now();
        if (now - lastWorkerErrorTime > 10000) {
            lastWorkerErrorTime = now;
            const errDetail = err?.message || err?.code || String(err);
            logger.error(
                `[Worker] Worker error (${errDetail}). Ensure Redis is running.`,
            );
        }
    });

    return worker;
};

export default initImageWorker;
