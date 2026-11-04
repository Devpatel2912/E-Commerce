import logger from "../config/logger.js";
import { imageQueue } from "./image.queue.js";

export const addImageJob = async (listingImageId, objectkey) => {
    try {
        const job = await imageQueue.add("process-listing-image", {
            listingImageId,
            objectkey,
        });

        logger.info(
            {
                jobId: job.id,
                listingImageId,
                objectkey,
            },
            "Image processing job added to queue",
        );
    } catch (error) {
        logger.error(
            {
                err: error,
                listingImageId,
            },
            "Failed to add image processing job",
        );
        throw error;
    }
};
