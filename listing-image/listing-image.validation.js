import path from "node:path";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MIME_TO_EXTENSION,
} from "../config/storage.js";

export const validatePresignRequest = (req, res, next) => {
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  const listingId = req.body.listing_id ?? req.body.listingId;
  const filename = req.body.filename;
  const contentType = req.body.content_type ?? req.body.contentType;
  const fileSize = req.body.file_size ?? req.body.fileSize;

  const errors = [];

  const numericListingId = Number(listingId);
  if (!Number.isSafeInteger(numericListingId) || numericListingId <= 0) {
    errors.push("listing_id must be a positive integer.");
  }

  if (typeof filename !== "string" || !filename.trim()) {
    errors.push("filename is required.");
  } else if (filename.includes("/") || filename.includes("\\")) {
    errors.push("filename must not contain directory paths.");
  }

  if (typeof contentType !== "string" || !contentType.trim()) {
    errors.push("content_type is required.");
  } else if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType.trim().toLowerCase())) {
    errors.push(
      "Only JPEG, PNG, and WebP images are permitted (image/jpeg, image/png, image/webp)."
    );
  }

  const numericFileSize = Number(fileSize);
  if (
    fileSize === undefined ||
    fileSize === null ||
    !Number.isFinite(numericFileSize) ||
    numericFileSize <= 0
  ) {
    errors.push("file_size must be a positive number of bytes.");
  } else if (numericFileSize > MAX_IMAGE_SIZE_BYTES) {
    const maxMb = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    errors.push(`file_size exceeds the maximum allowed limit of ${maxMb}MB.`);
  }

  if (filename && contentType && ALLOWED_IMAGE_MIME_TYPES.has(contentType.trim().toLowerCase())) {
    const ext = path.extname(filename).toLowerCase().replace(".", "");
    const normalizedExt = ext === "jpeg" ? "jpg" : ext;
    const expectedExt = MIME_TO_EXTENSION[contentType.trim().toLowerCase()];

    if (normalizedExt !== expectedExt) {
      errors.push(
        `File extension '.${ext}' does not match content_type '${contentType}'. Expected '.${expectedExt}'.`
      );
    }
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  req.body.listing_id = numericListingId;
  req.body.filename = filename.trim();
  req.body.content_type = contentType.trim().toLowerCase();
  req.body.file_size = numericFileSize;

  next();
};

export const validateCompleteRequest = (req, res, next) => {
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  const listingId = req.body.listing_id ?? req.body.listingId;
  const objectKey = req.body.object_key ?? req.body.objectKey;
  const isPrimary = req.body.is_primary ?? req.body.isPrimary;

  const errors = [];

  const numericListingId = Number(listingId);
  if (!Number.isSafeInteger(numericListingId) || numericListingId <= 0) {
    errors.push("listing_id must be a positive integer.");
  }

  if (typeof objectKey !== "string" || !objectKey.trim()) {
    errors.push("object_key is required.");
  } else {
    const trimmedKey = objectKey.trim();
    if (trimmedKey.includes("..")) {
      errors.push("object_key must not contain path traversal sequences.");
    }

    const expectedPrefix = `listings/${numericListingId}/`;
    if (!trimmedKey.startsWith(expectedPrefix)) {
      errors.push(
        `object_key must belong to listing ${numericListingId} (expected prefix: ${expectedPrefix}).`
      );
    }
  }

  if (isPrimary !== undefined && typeof isPrimary !== "boolean") {
    errors.push("is_primary must be a boolean value.");
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  req.body.listing_id = numericListingId;
  req.body.object_key = objectKey.trim();
  req.body.is_primary = Boolean(isPrimary);

  next();
};

export const validateListingIdParam = (req, res, next) => {
  const paramVal = req.params.listingId ?? req.params.id;
  const numericId = Number(paramVal);

  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid listing ID. Must be a positive integer.",
    });
  }

  req.params.listingId = String(numericId);
  next();
};

export const validateImageIdParam = (req, res, next) => {
  const paramVal = req.params.imageId ?? req.params.id;
  const numericId = Number(paramVal);

  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid image ID. Must be a positive integer.",
    });
  }

  req.params.imageId = String(numericId);
  next();
};
