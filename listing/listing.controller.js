import {
  createListing as insertListing,
  getAllListings as findAllListings,
  getListingById as findListingById,
  updateListing as editListing,
  deleteListing as removeListing,
} from "./listing.model.js";

export const createListing = async (req, res, next) => {
  try {
    const user_id = req.user?.user_id ?? req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const listing = await insertListing({
      ...req.body,
      user_id,
    });

    return res.status(201).json({
      success: true,
      message: "Listing created successfully.",
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllListings = async (req, res, next) => {
  try {
    const listings = await findAllListings();

    return res.status(200).json({
      success: true,
      count: listings.length,
      data: listings,
    });
  } catch (error) {
    next(error);
  }
};

export const getListingById = async (req, res, next) => {
  try {
    const listing = await findListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const user_id = req.user?.user_id ?? req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const existing = await findListingById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    if (String(existing.user_id) !== String(user_id)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own listings.",
      });
    }

    const listing = await editListing(req.params.id, user_id, req.body);

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully.",
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const user_id = req.user?.user_id ?? req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const listing = await removeListing(req.params.id, user_id);

    if (!listing) {
      const existing = await findListingById(req.params.id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found.",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You can only delete your own listings.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Listing deleted successfully.",
      data: {
        listing_id: listing.listing_id,
      },
    });
  } catch (error) {
    next(error);
  }
};
