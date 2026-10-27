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
    filename
  );

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.error("Local file deletion failed:", error);
    }
  }
};

const getAuthUserId = (req) => {
  return req.user?.id ?? req.user?.user_id;
};

export const presignListingImageUpload = async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { listing_id, filename, content_type, file_size } = req.body;

    const listing = await getListingById(listing_id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    const isOwner = String(listing.user_id) === String(userId);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only upload images for your own listings.",
      });
    }

    const currentCount = await countListingImages(listing_id);
    if (currentCount >= MAX_IMAGES_PER_LISTING) {
      return res.status(400).json({
        success: false,
        message: `Maximum limit of ${MAX_IMAGES_PER_LISTING} images reached for this listing.`,
      });
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

    return res.status(200).json({
      success: true,
      message: "Presigned upload URL generated successfully.",
      data: {
        upload_url: presignData.uploadUrl,
        object_key: objectKey,
        http_method: "PUT",
        expires_in: presignData.expiresIn,
        required_headers: presignData.requiredHeaders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const completeListingImageUpload = async (req, res, next) => {
  let createdObjectKey = null;

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { listing_id, object_key, is_primary } = req.body;
    createdObjectKey = object_key;

    const listing = await getListingById(listing_id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    const isOwner = String(listing.user_id) === String(userId);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only manage images for your own listings.",
      });
    }

    const existingImage = await getListingImageByObjectKey(object_key);
    if (existingImage) {
      return res.status(409).json({
        success: false,
        message: "This storage object has already been registered.",
      });
    }

    const storageMeta = await getStorageObjectMetadata(object_key);
    if (!storageMeta) {
      return res.status(400).json({
        success: false,
        message:
          "Uploaded object not found in storage. Ensure direct upload to the presigned URL completed before confirming.",
      });
    }

    if (
      storageMeta.contentLength <= 0 ||
      storageMeta.contentLength > MAX_IMAGE_SIZE_BYTES
    ) {
      await deleteStorageObject(object_key);
      const maxMb = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      return res.status(400).json({
        success: false,
        message: `Invalid file size (${storageMeta.contentLength} bytes). Must be > 0 and <= ${maxMb}MB.`,
      });
    }

    const verification = await verifyStorageObjectContent(object_key);
    if (!verification.isValid) {
      await deleteStorageObject(object_key);
      return res.status(400).json({
        success: false,
        message:
          "Uploaded file content is not a valid image format. Only JPEG, PNG, and WebP are allowed.",
      });
    }

    const existingCount = await countListingImages(listing_id);
    const finalIsPrimary =
      existingCount === 0 ? true : Boolean(is_primary);

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

    return res.status(201).json({
      success: true,
      message: "Listing image verified and saved successfully.",
      data: {
        ...imageRecord,
        access_url: accessUrl,
        image_url: accessUrl,
      },
    });
  } catch (error) {

    if (createdObjectKey) {
      await deleteStorageObject(createdObjectKey).catch(() => {});
    }
    next(error);
  }
};

export const retrieveListingImages = async (req, res, next) => {
  try {
    const listingId = req.params.listingId ?? req.params.id;

    const listing = await getListingById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    if (listing.status !== "active") {
      const userId = getAuthUserId(req);
      const isOwner = userId && String(listing.user_id) === String(userId);
      const isAdmin = req.user?.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Listing is not currently active.",
        });
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
      })
    );

    return res.status(200).json({
      success: true,
      message: "Listing images retrieved successfully.",
      count: resolvedImages.length,
      data: resolvedImages,
    });
  } catch (error) {
    next(error);
  }
};

export const removeListingImage = async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const imageId = req.params.imageId ?? req.params.id;
    const listingIdParam = req.params.listingId;

    const existingImage = await getListingImageById(
      imageId,
      listingIdParam ?? null
    );

    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: "Listing image not found.",
      });
    }

    const listing = await getListingById(existingImage.listing_id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Associated listing not found.",
      });
    }

    const isOwner = String(listing.user_id) === String(userId);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete images from your own listings.",
      });
    }

    if (existingImage.object_key) {
      await deleteStorageObject(existingImage.object_key);
    }

    if (existingImage.image_url) {
      await deleteLocalFile(existingImage.image_url);
    }

    const deletedImage = await deleteListingImage(
      existingImage.image_id,
      existingImage.listing_id
    );

    return res.status(200).json({
      success: true,
      message: "Listing image deleted successfully.",
      data: deletedImage,
    });
  } catch (error) {
    next(error);
  }
};

export const getListingImageAccessUrl = async (req, res, next) => {
  try {
    const imageId = req.params.imageId ?? req.params.id;

    const image = await getListingImageById(imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Listing image not found.",
      });
    }

    const listing = await getListingById(image.listing_id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Associated listing not found.",
      });
    }

    if (listing.status !== "active") {
      const userId = getAuthUserId(req);
      const isOwner = userId && String(listing.user_id) === String(userId);
      const isAdmin = req.user?.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Listing is not active.",
        });
      }
    }

    if (!image.object_key) {
      return res.status(200).json({
        success: true,
        data: {
          image_id: image.image_id,
          access_url: image.image_url,
          is_legacy_local: true,
        },
      });
    }

    const expiresIn = 3600;
    const accessUrl = await generatePresignedDownloadUrl({
      objectKey: image.object_key,
      expiresIn,
    });

    return res.status(200).json({
      success: true,
      data: {
        image_id: image.image_id,
        listing_id: image.listing_id,
        object_key: image.object_key,
        access_url: accessUrl,
        expires_in: expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadListingImage = async (req, res, next) => {
  let createdObjectKey = null;

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload under field name 'image'.",
      });
    }

    const listingId =
      req.params.id ??
      req.params.listingId ??
      req.body.listing_id ??
      req.body.listingId;

    const numericListingId = Number(listingId);
    if (!Number.isSafeInteger(numericListingId) || numericListingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive integer listing ID is required.",
      });
    }

    const listing = await getListingById(numericListingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    const isOwner = String(listing.user_id) === String(userId);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only upload images for your own listings.",
      });
    }

    const currentCount = await countListingImages(numericListingId);
    if (currentCount >= MAX_IMAGES_PER_LISTING) {
      return res.status(400).json({
        success: false,
        message: `Maximum limit of ${MAX_IMAGES_PER_LISTING} images reached for this listing.`,
      });
    }

    const detectedMime = detectImageMimeFromBytes(req.file.buffer);
    if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
      return res.status(400).json({
        success: false,
        message:
          "Uploaded file is not a valid image. Only JPEG, PNG, and WebP images are allowed.",
      });
    }

    const ext = MIME_TO_EXTENSION[detectedMime] || "jpg";
    const uniqueId = crypto.randomUUID();
    const objectKey = `listings/${numericListingId}/${uniqueId}.${ext}`;
    createdObjectKey = objectKey;

    await uploadBufferToStorage({
      objectKey,
      buffer: req.file.buffer,
      contentType: detectedMime,
    });

    const isPrimary =
      currentCount === 0 ||
      req.body.is_primary === "true" ||
      req.body.is_primary === true;

    const imageRecord = await createListingImage({
      listingId: numericListingId,
      objectKey,
      contentType: detectedMime,
      fileSize: req.file.size || req.file.buffer.length,
      isPrimary,
    });

    const accessUrl = await generatePresignedDownloadUrl({
      objectKey,
    });

    return res.status(201).json({
      success: true,
      message: "Listing image uploaded successfully to Neon Object Storage.",
      data: {
        ...imageRecord,
        access_url: accessUrl,
        image_url: accessUrl,
      },
    });
  } catch (error) {
    if (createdObjectKey) {
      await deleteStorageObject(createdObjectKey).catch(() => {});
    }
    next(error);
  }
};
