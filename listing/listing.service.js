import {
    createListing as insertListing,
    getAllListings as findAllListings,
    getListingById as findListingById,
    updateListing as editListing,
    deleteListing as removeListing,
} from "./listing.model.js";
import ApiError from "../utils/ApiError.js";

export const createListingService = async ({ userId, data }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const listing = await insertListing({
        ...data,
        user_id: userId,
    });

    return listing;
};

export const getAllListingsService = async () => {
    return await findAllListings();
};

export const getListingByIdService = async (id) => {
    const listing = await findListingById(id);
    if (!listing) {
        throw new ApiError(404, "Listing not found.");
    }
    return listing;
};

export const updateListingService = async ({ id, userId, data }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const existing = await findListingById(id);
    if (!existing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (String(existing.user_id) !== String(userId)) {
        throw new ApiError(403, "You can only update your own listings.");
    }

    const updated = await editListing(id, userId, data);
    return updated;
};

export const deleteListingService = async ({ id, userId }) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    const existing = await findListingById(id);
    if (!existing) {
        throw new ApiError(404, "Listing not found.");
    }

    if (String(existing.user_id) !== String(userId)) {
        throw new ApiError(403, "You can only delete your own listings.");
    }

    const listing = await removeListing(id, userId);
    return {
        listing_id: listing.listing_id,
    };
};
