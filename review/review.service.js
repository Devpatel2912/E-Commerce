import {
    createReview as createReviewModel,
    getReviewsByListing,
    countReviewsByListing,
    getReviewById,
    updateReview as updateReviewModel,
    deleteReview as deleteReviewModel,
    listingExists,
} from "./review.model.js";
import ApiError from "../utils/ApiError.js";

const isValidId = (value) => {
    if (
        (typeof value === "number" || typeof value === "string") &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) > 0
    ) {
        return true;
    }
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
};

const validateRating = (rating) =>
    Number.isInteger(rating) && rating >= 1 && rating <= 5;

export const createReviewService = async ({
    userId,
    listingId,
    rating,
    comment,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!isValidId(listingId)) {
        throw new ApiError(400, "A valid listing_id is required.");
    }

    if (!validateRating(rating)) {
        throw new ApiError(400, "Rating must be an integer from 1 to 5.");
    }

    if (
        comment !== undefined &&
        comment !== null &&
        (typeof comment !== "string" || comment.length > 2000)
    ) {
        throw new ApiError(
            400,
            "Comment must be a string of at most 2000 characters.",
        );
    }

    if (!(await listingExists(listingId))) {
        throw new ApiError(404, "Listing not found.");
    }

    try {
        const review = await createReviewModel({
            userId,
            listingId,
            rating,
            comment: comment?.trim() || null,
        });

        return review;
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(409, "You have already reviewed this listing.");
        }
        if (error.code === "23503") {
            throw new ApiError(404, "Related user or listing not found.");
        }
        throw error;
    }
};

export const getListingReviewsService = async ({ listingId, page, limit }) => {
    if (!isValidId(listingId)) {
        throw new ApiError(400, "Invalid listing ID.");
    }

    if (!(await listingExists(listingId))) {
        throw new ApiError(404, "Listing not found.");
    }

    const numPage = Number.parseInt(page ?? "1", 10);
    const numLimit = Number.parseInt(limit ?? "10", 10);

    if (
        !Number.isInteger(numPage) ||
        !Number.isInteger(numLimit) ||
        numPage < 1 ||
        numLimit < 1 ||
        numLimit > 100
    ) {
        throw new ApiError(
            400,
            "Page must be positive and limit must be between 1 and 100.",
        );
    }

    const offset = (numPage - 1) * numLimit;

    const [reviews, summary] = await Promise.all([
        getReviewsByListing(listingId, numLimit, offset),
        countReviewsByListing(listingId),
    ]);

    return {
        reviews,
        summary: {
            total: Number(summary.total),
            average_rating: Number(summary.average_rating),
        },
        pagination: {
            page: numPage,
            limit: numLimit,
            total: Number(summary.total),
            total_pages: Math.ceil(Number(summary.total) / numLimit),
        },
    };
};

export const getReviewByIdService = async (id) => {
    if (!isValidId(id)) {
        throw new ApiError(400, "Invalid review ID.");
    }

    const review = await getReviewById(id);
    if (!review) {
        throw new ApiError(404, "Review not found.");
    }

    return review;
};

export const updateReviewService = async ({
    reviewId,
    userId,
    rating,
    comment,
}) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!isValidId(reviewId)) {
        throw new ApiError(400, "Invalid review ID.");
    }

    if (rating === undefined && comment === undefined) {
        throw new ApiError(
            400,
            "Provide at least one field: rating or comment.",
        );
    }

    if (rating !== undefined && !validateRating(rating)) {
        throw new ApiError(400, "Rating must be an integer from 1 to 5.");
    }

    if (
        comment !== undefined &&
        comment !== null &&
        (typeof comment !== "string" || comment.length > 2000)
    ) {
        throw new ApiError(
            400,
            "Comment must be a string of at most 2000 characters.",
        );
    }

    const existingReview = await getReviewById(reviewId);
    if (!existingReview) {
        throw new ApiError(404, "Review not found.");
    }

    if (existingReview.user_id !== userId) {
        throw new ApiError(403, "You can only update your own reviews.");
    }

    try {
        const review = await updateReviewModel({
            reviewId,
            userId,
            rating,
            comment:
                comment === undefined ? undefined : comment?.trim() || null,
        });

        if (!review) {
            throw new ApiError(404, "Review not found.");
        }

        return review;
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(409, "You have already reviewed this listing.");
        }
        if (error.code === "23503") {
            throw new ApiError(404, "Related user or listing not found.");
        }
        throw error;
    }
};

export const deleteReviewService = async ({ reviewId, userId }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (!isValidId(reviewId)) {
        throw new ApiError(400, "Invalid review ID.");
    }

    const existingReview = await getReviewById(reviewId);
    if (!existingReview) {
        throw new ApiError(404, "Review not found.");
    }

    if (existingReview.user_id !== userId) {
        throw new ApiError(403, "You can only delete your own reviews.");
    }

    await deleteReviewModel(reviewId, userId);
    return true;
};
