import crypto from "node:crypto";
import {
    createListing as insertListing,
    getAllListings as findAllListings,
    getListingById as findListingById,
    updateListing as editListing,
    deleteListing as removeListing,
} from "./listing.model.js";
import { getCategoryById } from "../category/category.model.js";
import { createListingImage } from "../listing-image/listing-image.model.js";
import { enqueueImageProcessingJob } from "../jobs/image.queue.js";
import {
    uploadBufferToStorage,
    deleteStorageObject,
    generatePresignedDownloadUrl,
    MIME_TO_EXTENSION,
} from "../config/storage.js";
import {
    LISTING_STATUS,
    LISTING_IMAGE_STATUS,
} from "../constants/status.constants.js";
import ApiError from "../utils/ApiError.js";
import { ErrorCodes } from "../config/error.js";

export const createListingService = async ({ userId, data, files = [] }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    // Verify category exists before attempting insert
    const category = await getCategoryById(data.category_id);
    if (!category) {
        throw new ApiError(
            400,
            `Category with ID ${data.category_id} does not exist.`,
            {
                errorCode: ErrorCodes.CATEGORY_NOT_FOUND,
                errors: [
                    {
                        field: "category_id",
                        msg: `Category with ID ${data.category_id} does not exist.`,
                    },
                ],
            },
        );
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
    const createdObjectKeys = [];

    if (hasImages) {
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const ext = MIME_TO_EXTENSION[file.mimetype] || "jpg";
                const uniqueId = crypto.randomUUID();
                const objectKey = `listings/${listing.listing_id}/${uniqueId}.${ext}`;

                // Upload raw buffer to storage
                await uploadBufferToStorage({
                    objectKey,
                    buffer: file.buffer,
                    contentType: file.mimetype,
                });
                createdObjectKeys.push(objectKey);

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
        } catch (uploadError) {
            // Clean up uploaded objects & remove created listing row to avoid incomplete records
            for (const key of createdObjectKeys) {
                await deleteStorageObject(key).catch(() => {});
            }
            await removeListing(listing.listing_id, userId).catch(() => {});
            throw uploadError;
        }
    }

    return {
        ...listing,
        images: uploadedImages,
        message: hasImages
            ? "Listing created successfully. Images are queued for processing and metadata removal; listing will become active shortly."
            : "Listing created in pending state. Upload images to activate.",
    };
};

export const getAllListingsService = async () => {
    return await findAllListings();
};

export const getListingByIdService = async ({ id, userId = null }) => {
    const listing = await findListingById(id);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (listing.status !== LISTING_STATUS.ACTIVE) {
        const isOwner = userId && String(listing.user_id) === String(userId);
        if (!isOwner) {
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

    if (data.category_id !== undefined) {
        const category = await getCategoryById(data.category_id);
        if (!category) {
            throw new ApiError(
                400,
                `Category with ID ${data.category_id} does not exist.`,
                {
                    errorCode: ErrorCodes.CATEGORY_NOT_FOUND,
                },
            );
        }
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
