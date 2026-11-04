import {
    presignListingImageUploadService,
    completeListingImageUploadService,
    retrieveListingImagesService,
    removeListingImageService,
    getListingImageAccessUrlService,
} from "./listing-image.service.js";
import logger from "../config/logger.js";

const getAuthUserId = (req) => {
    return req.user?.id ?? req.user?.user_id;
};

const ListingImageController = {
    presignListingImageUpload: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            const { listing_id, filename, content_type } = req.body;
            logger.info(
                { userId, listing_id, filename, content_type },
                "Generating presigned upload URL.",
            );

            const data = await presignListingImageUploadService({
                userId,
                listing_id,
                filename,
                content_type,
            });

            logger.info(
                { userId, listing_id, objectKey: data.object_key },
                "Presigned upload URL generated successfully.",
            );

            return res.status(200).json({
                success: true,
                message: "Presigned upload URL generated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    completeListingImageUpload: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            const { listing_id, object_key, is_primary } = req.body;
            logger.info(
                { userId, listing_id, object_key },
                "Confirming listing image upload.",
            );

            const data = await completeListingImageUploadService({
                userId,
                listing_id,
                object_key,
                is_primary,
            });

            logger.info(
                { userId, listing_id, imageId: data.image_id },
                "Listing image confirmed and saved successfully.",
            );

            return res.status(201).json({
                success: true,
                message: "Listing image verified and saved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    retrieveListingImages: async (req, res, next) => {
        try {
            const listingId = req.params.listingId ?? req.params.id;
            const userId = getAuthUserId(req);
            logger.debug({ listingId, userId }, "Retrieving listing images.");

            const images = await retrieveListingImagesService({
                listingId,
                userId,
            });

            return res.status(200).json({
                success: true,
                message: "Listing images retrieved successfully.",
                count: images.length,
                data: images,
            });
        } catch (error) {
            next(error);
        }
    },

    removeListingImage: async (req, res, next) => {
        try {
            const userId = getAuthUserId(req);
            const imageId = req.params.imageId ?? req.params.id;
            const listingIdParam = req.params.listingId;
            logger.info(
                { userId, imageId, listingIdParam },
                "Deleting listing image.",
            );

            const deletedImage = await removeListingImageService({
                userId,
                imageId,
                listingIdParam,
            });

            logger.info(
                { userId, imageId },
                "Listing image deleted successfully.",
            );

            return res.status(200).json({
                success: true,
                message: "Listing image deleted successfully.",
                data: deletedImage,
            });
        } catch (error) {
            next(error);
        }
    },

    getListingImageAccessUrl: async (req, res, next) => {
        try {
            const imageId = req.params.imageId ?? req.params.id;
            const userId = getAuthUserId(req);
            logger.debug(
                { imageId, userId },
                "Generating download access URL for image.",
            );

            const data = await getListingImageAccessUrlService({
                imageId,
                userId,
            });

            return res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const {
    presignListingImageUpload,
    completeListingImageUpload,
    retrieveListingImages,
    removeListingImage,
    getListingImageAccessUrl,
} = ListingImageController;

export default ListingImageController;
