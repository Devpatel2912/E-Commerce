import {
    getAllUsersService,
    getUserByIdService,
    updateUserService,
    deleteUserService,
} from "./user.service.js";
import logger from "../config/logger.js";

const UserController = {
    getUsers: async (req, res, next) => {
        try {
            const { page, limit, offset } = req.pagination;
            logger.debug(
                { page, limit, offset },
                "Fetching paginated users list.",
            );
            const users = await getAllUsersService({ limit, offset });

            return res.status(200).json({
                success: true,
                message: "Users retrieved successfully.",
                pagination: {
                    page,
                    limit,
                    count: users.length,
                },
                data: users,
            });
        } catch (error) {
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            logger.debug({ userId: req.params.id }, "Fetching user by ID.");
            const user = await getUserByIdService(req.params.id);

            return res.status(200).json({
                success: true,
                message: "User retrieved successfully.",
                data: user,
            });
        } catch (error) {
            next(error);
        }
    },

    patchUser: async (req, res, next) => {
        try {
            logger.info({ userId: req.params.id }, "Updating user profile.");
            const user = await updateUserService(req.params.id, req.body);

            logger.info(
                { userId: req.params.id },
                "User profile updated successfully.",
            );

            return res.status(200).json({
                success: true,
                message: "User updated successfully.",
                data: user,
            });
        } catch (error) {
            next(error);
        }
    },

    removeUser: async (req, res, next) => {
        try {
            logger.info({ userId: req.params.id }, "Deleting user account.");
            await deleteUserService(req.params.id);

            logger.info(
                { userId: req.params.id },
                "User account deleted successfully.",
            );

            return res.status(200).json({
                success: true,
                message: "User account deleted successfully.",
            });
        } catch (error) {
            next(error);
        }
    },
};

export const { getUsers, getUserById, patchUser, removeUser } = UserController;
export { UserController as UsersController };
export default UserController;
