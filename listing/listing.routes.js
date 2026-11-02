import { Router } from "express";

import ListingController from "./listing.controller.js";

import {
    validateCreateListing,
    validateUpdateListing,
    validateListingId,
} from "./listing.validation.js";

import authMiddleware, {
    optionalAuthMiddleware,
} from "../middleware/auth.middleware.js";
import ReviewController from "../review/review.controller.js";
import ListingImageController from "../listing-image/listing-image.controller.js";

import multer from "multer";

const router = Router();

const uploadListingImages = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
}).fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 },
]);

const normalizeUploadedFiles = (req, _res, next) => {
    if (req.files) {
        const images = req.files.images || [];
        const singleImage = req.files.image || [];
        req.files = [...images, ...singleImage];
    } else if (req.file) {
        req.files = [req.file];
    } else {
        req.files = [];
    }
    next();
};

router.get("/", ListingController.getAllListings);
router.get(
    "/:id",
    optionalAuthMiddleware,
    validateListingId,
    ListingController.getListingById,
);
router.get("/:id/reviews", ReviewController.getListingReviews);
router.get(
    "/:id/images",
    optionalAuthMiddleware,
    validateListingId,
    ListingImageController.retrieveListingImages,
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
    uploadListingImages,
    normalizeUploadedFiles,
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
