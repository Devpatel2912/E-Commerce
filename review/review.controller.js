import {
    createReviewService,
    getListingReviewsService,
    getReviewByIdService,
    updateReviewService,
    deleteReviewService,
} from "./review.service.js";
import logger from "../config/logger.js";

const getUserId = (req) => req.user?.id;

const ReviewController = {
    createReview: async (req, res, next) => {
        try {
            const userId = getUserId(req);
            const { listing_id: listingId, rating, comment } = req.body;
            logger.info(
                { userId, listingId, rating },
                "Submitting review for listing.",
            );

            const review = await createReviewService({
                userId,
                listingId,
                rating,
                comment,
            });

            logger.info(
                { reviewId: review.id, userId, listingId },
                "Review created successfully.",
            );

            return res.status(201).json({
                success: true,
                message: "Review created successfully.",
                data: review,
            });
        } catch (error) {
            next(error);
        }
    },

    getListingReviews: async (req, res, next) => {
        try {
            const { id: listingId } = req.params;
            const { page, limit } = req.query;
            logger.debug(
                { listingId, page, limit },
                "Fetching reviews for listing.",
            );

            const data = await getListingReviewsService({
                listingId,
                page,
                limit,
            });

            return res.status(200).json({
                success: true,
                message: "Reviews retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    getReview: async (req, res, next) => {
        try {
            logger.debug({ reviewId: req.params.id }, "Fetching review by ID.");
            const review = await getReviewByIdService(req.params.id);

            return res.status(200).json({
                success: true,
                message: "Review retrieved successfully.",
                data: review,
            });
        } catch (error) {
            next(error);
        }
    },

    updateReview: async (req, res, next) => {
        try {
            const userId = getUserId(req);
            const { id: reviewId } = req.params;
            const { rating, comment } = req.body;
            logger.info({ reviewId, userId, rating }, "Updating review.");

            const review = await updateReviewService({
                reviewId,
                userId,
                rating,
                comment,
            });

            logger.info({ reviewId, userId }, "Review updated successfully.");

            return res.status(200).json({
                success: true,
                message: "Review updated successfully.",
                data: review,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteReview: async (req, res, next) => {
        try {
            const userId = getUserId(req);
            const { id: reviewId } = req.params;
            logger.info({ reviewId, userId }, "Deleting review.");

            await deleteReviewService({
                reviewId,
                userId,
            });

            logger.info({ reviewId, userId }, "Review deleted successfully.");

            return res.status(200).json({
                success: true,
                message: "Review deleted successfully.",
            });
        } catch (error) {
            next(error);
        }
    },
};

export const {
    createReview,
    getListingReviews,
    getReview,
    updateReview,
    deleteReview,
} = ReviewController;

export default ReviewController;
