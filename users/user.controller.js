import {
    getAllUsersService,
    getUserByIdService,
    updateUserService,
    deleteUserService,
} from "./user.service.js";

export const getUsers = async (req, res, next) => {
    try {
        const { page, limit, offset } = req.pagination;
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
};

export const getUserById = async (req, res, next) => {
    try {
        const user = await getUserByIdService(req.params.id);

        return res.status(200).json({
            success: true,
            message: "User retrieved successfully.",
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const patchUser = async (req, res, next) => {
    try {
        const user = await updateUserService(req.params.id, req.body);

        return res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const removeUser = async (req, res, next) => {
    try {
        await deleteUserService(req.params.id);

        return res.status(200).json({
            success: true,
            message: "User account deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
};
