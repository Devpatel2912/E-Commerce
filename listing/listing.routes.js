import { Router } from "express";

import ListingController from "./listing.controller.js";

import {
    validateCreateListing,
    validateUpdateListing,
    validateListingId,
} from "./listing.validation.js";

import authMiddleware from "../middleware/auth.middleware.js";
import ReviewController from "../review/review.controller.js";
import ListingImageController from "../listing-image/listing-image.controller.js";

import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

router.get("/", ListingController.getAllListings);
router.get("/:id", validateListingId, ListingController.getListingById);
router.get("/:id/reviews", ReviewController.getListingReviews);
router.get(
    "/:id/images",
    validateListingId,
    ListingImageController.retrieveListingImages,
);

router.post(
    "/:id/images",
    authMiddleware,
    validateListingId,
    upload.single("image"),
    ListingImageController.uploadListingImage,
);
router.delete(
    "/:id/images/:imageId",
    authMiddleware,
    validateListingId,
    ListingImageController.removeListingImage,
);

router.post(
    "/",
    authMiddleware,
    validateCreateListing,
    ListingController.createListing,
);

router.patch(
    "/:id",
    authMiddleware,
    validateListingId,
    validateUpdateListing,
    ListingController.updateListing,
);

router.delete(
    "/:id",
    authMiddleware,
    validateListingId,
    ListingController.deleteListing,
);

export default router;
