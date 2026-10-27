import { Router } from "express";

import {
    createListing,
    getAllListings,
    getListingById,
    updateListing,
    deleteListing,
} from "./listing.controller.js";

import {
    validateCreateListing,
    validateUpdateListing,
    validateListingId,
} from "./listing.validation.js";

import authMiddleware from "../middleware/auth.middleware.js";
import { getListingReviews } from "../review/review.controller.js";
import {
    retrieveListingImages,
    removeListingImage,
    uploadListingImage,
} from "../listing-image/listing-image.controller.js";

import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

router.get("/", getAllListings);
router.get("/:id", validateListingId, getListingById);
router.get("/:id/reviews", getListingReviews);
router.get("/:id/images", validateListingId, retrieveListingImages);

router.post(
    "/:id/images",
    authMiddleware,
    validateListingId,
    upload.single("image"),
    uploadListingImage,
);
router.delete(
    "/:id/images/:imageId",
    authMiddleware,
    validateListingId,
    removeListingImage,
);

router.post("/", authMiddleware, validateCreateListing, createListing);

router.patch(
    "/:id",
    authMiddleware,
    validateListingId,
    validateUpdateListing,
    updateListing,
);

router.delete("/:id", authMiddleware, validateListingId, deleteListing);

export default router;
