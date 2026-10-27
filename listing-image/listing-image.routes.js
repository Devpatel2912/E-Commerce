import { Router } from "express";
import multer from "multer";

import ListingImageController from "./listing-image.controller.js";

import {
    validatePresignRequest,
    validateCompleteRequest,
    validateListingIdParam,
    validateImageIdParam,
} from "./listing-image.validation.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

router.post(
    "/upload",
    authMiddleware,
    upload.single("image"),
    ListingImageController.uploadListingImage,
);

router.post(
    "/presign",
    authMiddleware,
    validatePresignRequest,
    ListingImageController.presignListingImageUpload,
);

router.post(
    "/complete",
    authMiddleware,
    validateCompleteRequest,
    ListingImageController.completeListingImageUpload,
);

router.get(
    "/listing/:listingId",
    validateListingIdParam,
    ListingImageController.retrieveListingImages,
);

router.get(
    "/:imageId/url",
    validateImageIdParam,
    ListingImageController.getListingImageAccessUrl,
);

router.delete(
    "/:imageId",
    authMiddleware,
    validateImageIdParam,
    ListingImageController.removeListingImage,
);

export default router;
