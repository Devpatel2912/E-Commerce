import { Router } from "express";
import multer from "multer";

import {
  presignListingImageUpload,
  completeListingImageUpload,
  retrieveListingImages,
  removeListingImage,
  getListingImageAccessUrl,
  uploadListingImage,
} from "./listing-image.controller.js";

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
  uploadListingImage
);

router.post(
  "/presign",
  authMiddleware,
  validatePresignRequest,
  presignListingImageUpload
);

router.post(
  "/complete",
  authMiddleware,
  validateCompleteRequest,
  completeListingImageUpload
);

router.get(
  "/listing/:listingId",
  validateListingIdParam,
  retrieveListingImages
);

router.get(
  "/:imageId/url",
  validateImageIdParam,
  getListingImageAccessUrl
);

router.delete(
  "/:imageId",
  authMiddleware,
  validateImageIdParam,
  removeListingImage
);

export default router;
