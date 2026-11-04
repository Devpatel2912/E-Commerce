import { Router } from "express";
import ListingImageController from "./listing-image.controller.js";

import {
    validatePresignRequest,
    validateCompleteRequest,
    validateListingIdParam,
    validateImageIdParam,
} from "./listing-image.validation.js";

import authMiddleware, {
    optionalAuthMiddleware,
} from "../middleware/auth.middleware.js";

const router = Router();

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
    optionalAuthMiddleware,
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
