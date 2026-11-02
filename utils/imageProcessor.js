import sharp from "sharp";
import logger from "../config/logger.js";

export const stripImageMetadata = async (inputBuffer, format = null) => {
    try {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        const targetFormat = format || metadata.format || "jpeg";

        let pipeline = image.rotate();

        if (targetFormat === "jpeg" || targetFormat === "jpg") {
            pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
        } else if (targetFormat === "png") {
            pipeline = pipeline.png({ compressionLevel: 8 });
        } else if (targetFormat === "webp") {
            pipeline = pipeline.webp({ quality: 85 });
        }

        const buffer = await pipeline.toBuffer();
        const cleanedMetadata = await sharp(buffer).metadata();

        const contentType =
            targetFormat === "png"
                ? "image/png"
                : targetFormat === "webp"
                  ? "image/webp"
                  : "image/jpeg";

        return {
            buffer,
            contentType,
            width: cleanedMetadata.width,
            height: cleanedMetadata.height,
        };
    } catch (error) {
        logger.error("Failed to strip image metadata with sharp:", error);
        throw error;
    }
};

export default stripImageMetadata;
