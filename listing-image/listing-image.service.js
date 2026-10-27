import fs from "node:fs/promises";
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

import { getListingById } from "../listing/listing.model.js";

import {
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    getStorageObjectMetadata,
    verifyStorageObjectContent,
    deleteStorageObject,
    uploadBufferToStorage,
    detectImageMimeFromBytes,
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGES_PER_LISTING,
    PRESIGNED_URL_EXPIRES_IN,
    MIME_TO_EXTENSION,
} from "../config/storage.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

const deleteLocalFile = async (imageUrl) => {
    if (!imageUrl?.startsWith("/uploads/listing-images/")) {
        return;
    }

    const filename = path.basename(imageUrl);
    const filePath = path.resolve(
        process.cwd(),
        "uploads",
        "listing-images",
        filename,
    );

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            logger.error("Local file deletion failed:", error);
        }
    }
};

export const presignListingImageUploadService = async ({
    userId,
    role,
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
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
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
    role,
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
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
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
    });

    const accessUrl = await generatePresignedDownloadUrl({
        objectKey: object_key,
    });

    return {
        ...imageRecord,
        access_url: accessUrl,
        image_url: accessUrl,
    };
};

export const retrieveListingImagesService = async ({
    listingId,
    userId,
    role,
}) => {
    const listing = await getListingById(listingId);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (listing.status !== "active") {
        const isOwner = userId && String(listing.user_id) === String(userId);
        const isAdmin = role === "admin";
        if (!isOwner && !isAdmin) {
            throw new ApiError(
                403,
                "Access denied. Listing is not currently active.",
            );
        }
    }

    const images = await getListingImages(listingId);

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
    role,
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
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
        throw new ApiError(
            403,
            "You can only delete images from your own listings.",
        );
    }

    if (existingImage.object_key) {
        await deleteStorageObject(existingImage.object_key).catch(() => {});
    }

    if (existingImage.image_url) {
        await deleteLocalFile(existingImage.image_url);
    }

    const deletedImage = await deleteListingImage(
        existingImage.image_id,
        existingImage.listing_id,
    );

    return deletedImage;
};

export const getListingImageAccessUrlService = async ({
    imageId,
    userId,
    role,
}) => {
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
        const isAdmin = role === "admin";
        if (!isOwner && !isAdmin) {
            throw new ApiError(403, "Access denied. Listing is not active.");
        }
    }

    if (!image.object_key) {
        return {
            image_id: image.image_id,
            access_url: image.image_url,
            is_legacy_local: true,
        };
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

export const uploadListingImageService = async ({
    userId,
    role,
    file,
    listingId,
    is_primary,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!file) {
        throw new ApiError(
            400,
            "Please select an image file to upload under field name 'image'.",
        );
    }

    const numericListingId = Number(listingId);
    if (!Number.isSafeInteger(numericListingId) || numericListingId <= 0) {
        throw new ApiError(
            400,
            "A valid positive integer listing ID is required.",
        );
    }

    const listing = await getListingById(numericListingId);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }

    const isOwner = String(listing.user_id) === String(userId);
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
        throw new ApiError(
            403,
            "You can only upload images for your own listings.",
        );
    }

    const currentCount = await countListingImages(numericListingId);
    if (currentCount >= MAX_IMAGES_PER_LISTING) {
        throw new ApiError(
            400,
            `Maximum limit of ${MAX_IMAGES_PER_LISTING} images reached for this listing.`,
        );
    }

    const detectedMime = detectImageMimeFromBytes(file.buffer);
    if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
        throw new ApiError(
            400,
            "Uploaded file is not a valid image. Only JPEG, PNG, and WebP images are allowed.",
        );
    }

    const ext = MIME_TO_EXTENSION[detectedMime] || "jpg";
    const uniqueId = crypto.randomUUID();
    const objectKey = `listings/${numericListingId}/${uniqueId}.${ext}`;

    try {
        await uploadBufferToStorage({
            objectKey,
            buffer: file.buffer,
            contentType: detectedMime,
        });

        const finalIsPrimary =
            currentCount === 0 || is_primary === "true" || is_primary === true;

        const imageRecord = await createListingImage({
            listingId: numericListingId,
            objectKey,
            contentType: detectedMime,
            fileSize: file.size || file.buffer.length,
            isPrimary: finalIsPrimary,
        });

        const accessUrl = await generatePresignedDownloadUrl({
            objectKey,
        });

        return {
            ...imageRecord,
            access_url: accessUrl,
            image_url: accessUrl,
        };
    } catch (error) {
        await deleteStorageObject(objectKey).catch(() => {});
        throw error;
    }
};
