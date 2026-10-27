import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "./env.js";
import logger from "./logger.js";

export const STORAGE_BUCKET = config.storage.bucket;
export const STORAGE_REGION = config.storage.region;
export const STORAGE_ENDPOINT = config.storage.endpoint;
export const STORAGE_ACCESS_KEY_ID = config.storage.accessKeyId;
export const STORAGE_SECRET_ACCESS_KEY = config.storage.secretAccessKey;
export const MAX_IMAGE_SIZE_BYTES = config.storage.maxImageSizeBytes;
export const MAX_IMAGES_PER_LISTING = config.storage.maxImagesPerListing;
export const PRESIGNED_URL_EXPIRES_IN = config.storage.presignedUrlExpiresIn;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const EXTENSION_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const s3Client = new S3Client({
  region: STORAGE_REGION,
  endpoint: STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export const generatePresignedUploadUrl = async ({
  objectKey,
  contentType,
  expiresIn = PRESIGNED_URL_EXPIRES_IN,
}) => {
  const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn,
  });

  return {
    uploadUrl,
    objectKey,
    httpMethod: "PUT",
    expiresIn,
    requiredHeaders: {
      "Content-Type": contentType,
    },
  };
};

export const uploadBufferToStorage = async ({
  objectKey,
  buffer,
  contentType,
}) => {
  const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
  });

  return await s3Client.send(command);
};

export const generatePresignedDownloadUrl = async ({
  objectKey,
  expiresIn = 3600,
}) => {
  if (!objectKey) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: objectKey,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const getStorageObjectMetadata = async (objectKey) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: objectKey,
    });

    const response = await s3Client.send(command);

    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType ?? null,
      etag: response.ETag ?? null,
      lastModified: response.LastModified ?? null,
    };
  } catch (error) {
    if (
      error.name === "NotFound" ||
      error.$metadata?.httpStatusCode === 404 ||
      error.Code === "NoSuchKey"
    ) {
      return null;
    }
    throw error;
  }
};

export const detectImageMimeFromBytes = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  const gif = buffer.toString("ascii", 0, 3);
  if (gif === "GIF") {
    return "image/gif";
  }

  return null;
};

export const verifyStorageObjectContent = async (objectKey) => {
  try {
    const command = new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: objectKey,
      Range: "bytes=0-15",
    });

    const response = await s3Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const detectedMime = detectImageMimeFromBytes(buffer);

    return {
      isValid: detectedMime !== null && ALLOWED_IMAGE_MIME_TYPES.has(detectedMime),
      detectedMime,
    };
  } catch (error) {
    logger.error("Failed to verify storage object magic bytes:", error);
    return {
      isValid: false,
      detectedMime: null,
    };
  }
};

export const deleteStorageObject = async (objectKey) => {
  if (!objectKey) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: objectKey,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    logger.error(`Failed to delete storage object "${objectKey}":`, error);
    return false;
  }
};

export default s3Client;
