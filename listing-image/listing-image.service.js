import path from "node:path";
import crypto from "node:crypto";

import {
    createListingImage,
    getListingImages,
    getListingImageById,
    getListingImageByObjectKey,
    countListingImages,
    deleteListingImage,
} from "./listing-image.model.js";

import {
    getListingById,
    updateListingStatus,
} from "../listing/listing.model.js";

import {
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    getStorageObjectMetadata,
    verifyStorageObjectContent,
    deleteStorageObject,
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGES_PER_LISTING,
    PRESIGNED_URL_EXPIRES_IN,
    MIME_TO_EXTENSION,
} from "../config/storage.js";
import { LISTING_STATUS } from "../constants/status.constants.js";
import ApiError from "../utils/ApiError.js";

import { addImageJob } from "../queue/image.producer.js";
import { LISTING_IMAGE_STATUS } from "../constants/status.constants.js";

export const presignListingImageUploadService = async ({
    userId,
    listing_id,
    filename,
    content_type,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const listing = await getListingById(listing_id);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    const isOwner = String(listing.user_id) === String(userId);
    if (!isOwner) {
        throw new ApiError(
            403,
            "You can only upload images for your own listings.",
        );
    }

    const currentCount = await countListingImages(listing_id);
    if (currentCount >= MAX_IMAGES_PER_LISTING) {
        throw new ApiError(
            400,
            `Maximum limit of ${MAX_IMAGES_PER_LISTING} images reached for this listing.`,
        );
    }

    const ext =
        MIME_TO_EXTENSION[content_type] ||
        path.extname(filename).toLowerCase().replace(".", "") ||
        "jpg";

    const uniqueId = crypto.randomUUID();
    const objectKey = `listings/${listing_id}/${uniqueId}.${ext}`;

    const presignData = await generatePresignedUploadUrl({
        objectKey,
        contentType: content_type,
        expiresIn: PRESIGNED_URL_EXPIRES_IN,
    });

    return {
        upload_url: presignData.uploadUrl,
        object_key: objectKey,
        http_method: "PUT",
        expires_in: presignData.expiresIn,
        required_headers: presignData.requiredHeaders,
    };
};

export const completeListingImageUploadService = async ({
    userId,
    listing_id,
    object_key,
    is_primary,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const listing = await getListingById(listing_id);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    const isOwner = String(listing.user_id) === String(userId);
    if (!isOwner) {
        throw new ApiError(
            403,
            "You can only manage images for your own listings.",
        );
    }

    const existingImage = await getListingImageByObjectKey(object_key);
    if (existingImage) {
        throw new ApiError(
            409,
            "This storage object has already been registered.",
        );
    }

    const storageMeta = await getStorageObjectMetadata(object_key);
    if (!storageMeta) {
        throw new ApiError(
            400,
            "Uploaded object not found in storage. Ensure direct upload to the presigned URL completed before confirming.",
        );
    }

    if (
        storageMeta.contentLength <= 0 ||
        storageMeta.contentLength > MAX_IMAGE_SIZE_BYTES
    ) {
        await deleteStorageObject(object_key).catch(() => {});
        const maxMb = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
        throw new ApiError(
            400,
            `Invalid file size (${storageMeta.contentLength} bytes). Must be > 0 and <= ${maxMb}MB.`,
        );
    }

    const verification = await verifyStorageObjectContent(object_key);
    if (!verification.isValid) {
        await deleteStorageObject(object_key).catch(() => {});
        throw new ApiError(
            400,
            "Uploaded file content is not a valid image format. Only JPEG, PNG, and WebP are allowed.",
        );
    }

    const existingCount = await countListingImages(listing_id);
    const finalIsPrimary = existingCount === 0 ? true : Boolean(is_primary);

    const imageRecord = await createListingImage({
        listingId: listing_id,
        objectKey: object_key,
        contentType: verification.detectedMime || storageMeta.contentType,
        fileSize: storageMeta.contentLength,
        isPrimary: finalIsPrimary,
        status: LISTING_IMAGE_STATUS.PENDING,
    });

    const job = await addImageJob(imageRecord.image_id, imageRecord.object_key);

    if (listing.status === LISTING_STATUS.PENDING) {
        await updateListingStatus(listing_id, LISTING_STATUS.ACTIVE);
    }

    const accessUrl = await generatePresignedDownloadUrl({
        objectKey: object_key,
    });

    return {
        ...imageRecord,
        job_id: job.id,
        access_url: accessUrl,
        image_url: accessUrl,
    };
};

export const retrieveListingImagesService = async ({ listingId, userId }) => {
    const listing = await getListingById(listingId);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    const isOwner = userId && String(listing.user_id) === String(userId);
    if (listing.status !== LISTING_STATUS.ACTIVE) {
        if (!isOwner) {
            throw new ApiError(
                404,
                "Listing not found or is currently processing.",
            );
        }
    }

    const includePending = Boolean(isOwner);
    const images = await getListingImages(listingId, includePending);

    const resolvedImages = await Promise.all(
        images.map(async (img) => {
            let accessUrl = img.image_url;
            if (img.object_key) {
                accessUrl = await generatePresignedDownloadUrl({
                    objectKey: img.object_key,
                });
            }
            return {
                ...img,
                access_url: accessUrl,
                image_url: accessUrl,
            };
        }),
    );

    return resolvedImages;
};

export const removeListingImageService = async ({
    userId,
    imageId,
    listingIdParam,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const existingImage = await getListingImageById(
        imageId,
        listingIdParam ?? null,
    );
    if (!existingImage) {
        throw new ApiError(404, "Listing image not found.");
    }

    const listing = await getListingById(existingImage.listing_id);
    if (!listing) {
        throw new ApiError(404, "Associated listing not found.");
    }

    const isOwner = String(listing.user_id) === String(userId);
    if (!isOwner) {
        throw new ApiError(
            403,
            "You can only delete images from your own listings.",
        );
    }

    if (existingImage.object_key) {
        await deleteStorageObject(existingImage.object_key).catch(() => {});
    }

    const deletedImage = await deleteListingImage(
        existingImage.image_id,
        existingImage.listing_id,
    );

    return deletedImage;
};

export const getListingImageAccessUrlService = async ({ imageId, userId }) => {
    const image = await getListingImageById(imageId);
    if (!image) {
        throw new ApiError(404, "Listing image not found.");
    }

    const listing = await getListingById(image.listing_id);
    if (!listing) {
        throw new ApiError(404, "Associated listing not found.");
    }

    if (listing.status !== "active") {
        const isOwner = userId && String(listing.user_id) === String(userId);
        if (!isOwner) {
            throw new ApiError(403, "Access denied. Listing is not active.");
        }
    }

    if (!image.object_key) {
        throw new ApiError(404, "Listing image storage object not found.");
    }

    const expiresIn = 3600;
    const accessUrl = await generatePresignedDownloadUrl({
        objectKey: image.object_key,
        expiresIn,
    });

    return {
        image_id: image.image_id,
        listing_id: image.listing_id,
        object_key: image.object_key,
        access_url: accessUrl,
        expires_in: expiresIn,
    };
};
