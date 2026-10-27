import {
    presignListingImageUploadService,
    completeListingImageUploadService,
    retrieveListingImagesService,
    removeListingImageService,
    getListingImageAccessUrlService,
    uploadListingImageService,
} from "./listing-image.service.js";

const getAuthUserId = (req) => {
    return req.user?.id ?? req.user?.user_id;
};

export const presignListingImageUpload = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const { listing_id, filename, content_type, file_size } = req.body;

        const data = await presignListingImageUploadService({
            userId,
            role: req.user?.role,
            listing_id,
            filename,
            content_type,
            file_size,
        });

        return res.status(200).json({
            success: true,
            message: "Presigned upload URL generated successfully.",
            data,
        });
    } catch (error) {
        next(error);
    }
};

export const completeListingImageUpload = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const { listing_id, object_key, is_primary } = req.body;

        const data = await completeListingImageUploadService({
            userId,
            role: req.user?.role,
            listing_id,
            object_key,
            is_primary,
        });

        return res.status(201).json({
            success: true,
            message: "Listing image verified and saved successfully.",
            data,
        });
    } catch (error) {
        next(error);
    }
};

export const retrieveListingImages = async (req, res, next) => {
    try {
        const listingId = req.params.listingId ?? req.params.id;
        const userId = getAuthUserId(req);

        const images = await retrieveListingImagesService({
            listingId,
            userId,
            role: req.user?.role,
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
};

export const removeListingImage = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const imageId = req.params.imageId ?? req.params.id;
        const listingIdParam = req.params.listingId;

        const deletedImage = await removeListingImageService({
            userId,
            role: req.user?.role,
            imageId,
            listingIdParam,
        });

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
        const userId = getAuthUserId(req);

        const data = await getListingImageAccessUrlService({
            imageId,
            userId,
            role: req.user?.role,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};

export const uploadListingImage = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const listingId =
            req.params.id ??
            req.params.listingId ??
            req.body.listing_id ??
            req.body.listingId;

        const data = await uploadListingImageService({
            userId,
            role: req.user?.role,
            file: req.file,
            listingId,
            is_primary: req.body.is_primary,
        });

        return res.status(201).json({
            success: true,
            message:
                "Listing image uploaded successfully to Neon Object Storage.",
            data,
        });
    } catch (error) {
        next(error);
    }
};
