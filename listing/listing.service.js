import crypto from "node:crypto";
import {
    createListing as insertListing,
    getAllListings as findAllListings,
    getListingById as findListingById,
    updateListing as editListing,
    deleteListing as removeListing,
} from "./listing.model.js";
import { createListingImage } from "../listing-image/listing-image.model.js";
import { enqueueImageProcessingJob } from "../jobs/image.queue.js";
import {
    uploadBufferToStorage,
    generatePresignedDownloadUrl,
    MIME_TO_EXTENSION,
} from "../config/storage.js";
import {
    LISTING_STATUS,
    LISTING_IMAGE_STATUS,
} from "../constants/status.constants.js";
import ApiError from "../utils/ApiError.js";

export const createListingService = async ({ userId, data, files = [] }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const hasImages = Array.isArray(files) && files.length > 0;
    const initialStatus = hasImages
        ? LISTING_STATUS.PROCESSING
        : LISTING_STATUS.PENDING;

    const listing = await insertListing({
        ...data,
        user_id: userId,
        status: initialStatus,
    });

    const uploadedImages = [];

    if (hasImages) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = MIME_TO_EXTENSION[file.mimetype] || "jpg";
            const uniqueId = crypto.randomUUID();
            const objectKey = `listings/${listing.listing_id}/${uniqueId}.${ext}`;

            // Upload raw buffer to S3 storage
            await uploadBufferToStorage({
                objectKey,
                buffer: file.buffer,
                contentType: file.mimetype,
            });

            // The very first image is automatically primary
            const isPrimary = i === 0;

            const imageRecord = await createListingImage({
                listingId: listing.listing_id,
                objectKey,
                contentType: file.mimetype,
                fileSize: file.size || file.buffer.length,
                isPrimary,
                status: LISTING_IMAGE_STATUS.PENDING,
            });

            // Enqueue background processing
            await enqueueImageProcessingJob({
                listingId: listing.listing_id,
                objectKey,
                isPrimary,
                userId,
                imageId: imageRecord.image_id,
            });

            const accessUrl = await generatePresignedDownloadUrl({
                objectKey,
            });

            uploadedImages.push({
                ...imageRecord,
                access_url: accessUrl,
                image_url: accessUrl,
            });
        }
    }

    return {
        images: uploadedImages,
        message: hasImages
            ? "Listing created successfully. Images are queued for processing and metadata removal; listing will become active shortly."
            : "Listing created in pending state. Upload images to activate.",
    };
};

export const getAllListingsService = async () => {
    return await findAllListings();
};

export const getListingByIdService = async ({
    id,
    userId = null,
    role = null,
}) => {
    const listing = await findListingById(id);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (listing.status !== LISTING_STATUS.ACTIVE) {
        const isOwner = userId && String(listing.user_id) === String(userId);
        const isAdmin = role === "admin";
        if (!isOwner && !isAdmin) {
            throw new ApiError(
                404,
                "Listing not found or is currently processing.",
            );
        }
    }

    return listing;
};

export const updateListingService = async ({ id, userId, data }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const existing = await findListingById(id);
    if (!existing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (String(existing.user_id) !== String(userId)) {
        throw new ApiError(403, "You can only update your own listings.");
    }

    const updated = await editListing(id, userId, data);
    return updated;
};

export const deleteListingService = async ({ id, userId }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const existing = await findListingById(id);
    if (!existing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (String(existing.user_id) !== String(userId)) {
        throw new ApiError(403, "You can only delete your own listings.");
    }

    const deleted = await removeListing(id, userId);
    return deleted;
};
