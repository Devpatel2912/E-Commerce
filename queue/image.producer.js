import logger from "../config/logger.js";
import { imageQueue } from "./image.queue.js";

export const addImageJob = async (listingImageId, objectKey) => {
    try {
        const job = await imageQueue.add("process-listing-image", {
            listingImageId,
            objectKey,
        });

        logger.info(
            {
                jobId: job.id,
                listingImageId,
                objectKey,
            },
            "Image processing job added to queue",
        );

        return job;
    } catch (error) {
        logger.error(
            {
                err: error,
                listingImageId,
                objectKey,
            },
            "Failed to add image processing job",
        );

        throw error;
    }
};
