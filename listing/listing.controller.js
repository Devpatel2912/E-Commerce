import {
    createListingService,
    getAllListingsService,
    getListingByIdService,
    updateListingService,
    deleteListingService,
} from "./listing.service.js";

const ListingController = {
    createListing: async (req, res, next) => {
        try {
            const userId = req.user?.user_id ?? req.user?.id;
            const listing = await createListingService({
                userId,
                data: req.body,
            });

            return res.status(201).json({
                success: true,
                message: "Listing created successfully.",
                data: listing,
            });
        } catch (error) {
            next(error);
        }
    },

    getAllListings: async (req, res, next) => {
        try {
            const listings = await getAllListingsService();

            return res.status(200).json({
                success: true,
                count: listings.length,
                data: listings,
            });
        } catch (error) {
            next(error);
        }
    },

    getListingById: async (req, res, next) => {
        try {
            const listing = await getListingByIdService(req.params.id);

            return res.status(200).json({
                success: true,
                data: listing,
            });
        } catch (error) {
            next(error);
        }
    },

    updateListing: async (req, res, next) => {
        try {
            const userId = req.user?.user_id ?? req.user?.id;
            const listing = await updateListingService({
                id: req.params.id,
                userId,
                data: req.body,
            });

            return res.status(200).json({
                success: true,
                message: "Listing updated successfully.",
                data: listing,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteListing: async (req, res, next) => {
        try {
            const userId = req.user?.user_id ?? req.user?.id;
            const result = await deleteListingService({
                id: req.params.id,
                userId,
            });

            return res.status(200).json({
                success: true,
                message: "Listing deleted successfully.",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const {
    createListing,
    getAllListings,
    getListingById,
    updateListing,
    deleteListing,
} = ListingController;

export default ListingController;
