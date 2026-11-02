/**
 * Centralized Enum Constants for Listings and Listing Images.
 * Used across models, services, controllers, validations, and workers.
 */

export const LISTING_STATUS = Object.freeze({
    PENDING: "pending",
    PROCESSING: "processing",
    ACTIVE: "active",
    SOLD: "sold",
    INACTIVE: "inactive",
});

export const LISTING_IMAGE_STATUS = Object.freeze({
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
});

export const LISTING_CONDITIONS = Object.freeze({
    NEW: "new",
    USED: "used",
});

export const VALID_LISTING_STATUSES = Object.freeze(
    Object.values(LISTING_STATUS),
);

export const VALID_LISTING_IMAGE_STATUSES = Object.freeze(
    Object.values(LISTING_IMAGE_STATUS),
);

export const VALID_CONDITIONS = Object.freeze(
    Object.values(LISTING_CONDITIONS),
);

export default {
    LISTING_STATUS,
    LISTING_IMAGE_STATUS,
    LISTING_CONDITIONS,
    VALID_LISTING_STATUSES,
    VALID_LISTING_IMAGE_STATUSES,
    VALID_CONDITIONS,
};
