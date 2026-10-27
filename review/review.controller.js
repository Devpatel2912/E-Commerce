import {
    createReviewService,
    getListingReviewsService,
    getReviewByIdService,
    updateReviewService,
    deleteReviewService,
} from "./review.service.js";

const getUserId = (req) => req.user?.id;

const ReviewController = {
    createReview: async (req, res, next) => {
        try {
            const userId = getUserId(req);
            const { listing_id: listingId, rating, comment } = req.body;

            const review = await createReviewService({
                userId,
                listingId,
                rating,
                comment,
            });

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

            const review = await updateReviewService({
                reviewId,
                userId,
                rating,
                comment,
            });

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

            await deleteReviewService({
                reviewId,
                userId,
            });

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
