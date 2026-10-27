import {
  createReview as createReviewModel,
  getReviewsByListing,
  countReviewsByListing,
  getReviewById,
  updateReview as updateReviewModel,
  deleteReview as deleteReviewModel,
  listingExists,
} from "./review.model.js";
import logger from "../config/logger.js";

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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
};

const getUserId = (req) => req.user?.id;

const validateRating = (rating) =>
  Number.isInteger(rating) && rating >= 1 && rating <= 5;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const handleDatabaseError = (error, res) => {
  if (error.code === "23505") {
    return sendError(
      res,
      409,
      "You have already reviewed this listing.",
    );
  }

  if (error.code === "23503") {
    return sendError(res, 404, "Related user or listing not found.");
  }

  logger.error("Review API error:", error);

  return sendError(res, 500, "Internal server error.");
};

export const createReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { listing_id: listingId, rating, comment } = req.body;

    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    if (!isValidId(listingId)) {
      return sendError(res, 400, "A valid listing_id is required.");
    }

    if (!validateRating(rating)) {
      return sendError(res, 400, "Rating must be an integer from 1 to 5.");
    }

    if (
      comment !== undefined &&
      comment !== null &&
      (typeof comment !== "string" || comment.length > 2000)
    ) {
      return sendError(
        res,
        400,
        "Comment must be a string of at most 2000 characters.",
      );
    }

    if (!(await listingExists(listingId))) {
      return sendError(res, 404, "Listing not found.");
    }

    const review = await createReviewModel({
      userId,
      listingId,
      rating,
      comment: comment?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: "Review created successfully.",
      data: review,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
};

export const getListingReviews = async (req, res) => {
  try {
    const { id: listingId } = req.params;

    if (!isValidId(listingId)) {
      return sendError(res, 400, "Invalid listing ID.");
    }

    if (!(await listingExists(listingId))) {
      return sendError(res, 404, "Listing not found.");
    }

    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return sendError(
        res,
        400,
        "Page must be positive and limit must be between 1 and 100.",
      );
    }

    const offset = (page - 1) * limit;

    const [reviews, summary] = await Promise.all([
      getReviewsByListing(listingId, limit, offset),
      countReviewsByListing(listingId),
    ]);

    return res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully.",
      data: {
        reviews,
        summary: {
          total: Number(summary.total),
          average_rating: Number(summary.average_rating),
        },
        pagination: {
          page,
          limit,
          total: Number(summary.total),
          total_pages: Math.ceil(Number(summary.total) / limit),
        },
      },
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
};

export const getReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid review ID.");
    }

    const review = await getReviewById(id);

    if (!review) {
      return sendError(res, 404, "Review not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Review retrieved successfully.",
      data: review,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
};

export const updateReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id: reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    if (!isValidId(reviewId)) {
      return sendError(res, 400, "Invalid review ID.");
    }

    if (rating === undefined && comment === undefined) {
      return sendError(
        res,
        400,
        "Provide at least one field: rating or comment.",
      );
    }

    if (rating !== undefined && !validateRating(rating)) {
      return sendError(res, 400, "Rating must be an integer from 1 to 5.");
    }

    if (
      comment !== undefined &&
      comment !== null &&
      (typeof comment !== "string" || comment.length > 2000)
    ) {
      return sendError(
        res,
        400,
        "Comment must be a string of at most 2000 characters.",
      );
    }

    const existingReview = await getReviewById(reviewId);

    if (!existingReview) {
      return sendError(res, 404, "Review not found.");
    }

    if (existingReview.user_id !== userId) {
      return sendError(
        res,
        403,
        "You can only update your own reviews.",
      );
    }

    const review = await updateReviewModel({
      reviewId,
      userId,
      rating,
      comment: comment === undefined ? undefined : comment?.trim() || null,
    });

    if (!review) {
      return sendError(res, 404, "Review not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      data: review,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
};

export const deleteReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id: reviewId } = req.params;

    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    if (!isValidId(reviewId)) {
      return sendError(res, 400, "Invalid review ID.");
    }

    const existingReview = await getReviewById(reviewId);

    if (!existingReview) {
      return sendError(res, 404, "Review not found.");
    }

    if (existingReview.user_id !== userId) {
      return sendError(
        res,
        403,
        "You can only delete your own reviews.",
      );
    }

    await deleteReviewModel(reviewId, userId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
};
