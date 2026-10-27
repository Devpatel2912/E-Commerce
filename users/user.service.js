import {
    findUserById as findUserByIdModel,
    updateUser as updateUserModel,
    deleteUser as deleteUserModel,
    findUsers as findUsersModel,
} from "./user.model.js";
import ApiError from "../utils/ApiError.js";

export const getAllUsersService = async ({ limit, offset }) => {
    const users = await findUsersModel(limit, offset);
    return users;
};

export const getUserByIdService = async (id) => {
    const user = await findUserByIdModel(id);
    if (!user) {
        throw new ApiError(404, "User not found.");
    }
    return user;
};

export const updateUserService = async (id, updateData) => {
    try {
        const user = await updateUserModel(id, updateData);
        if (!user) {
            throw new ApiError(404, "User not found.");
        }
        return user;
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(409, "Email address is already in use.");
        }
        throw error;
    }
};

export const deleteUserService = async (id) => {
    try {
        const deletedUser = await deleteUserModel(id);
        if (!deletedUser) {
            throw new ApiError(404, "User not found.");
        }
        return deletedUser;
    } catch (error) {
        if (error.code === "23503") {
            throw new ApiError(
                409,
                "This account has related records and cannot be deleted directly.",
            );
        }
        throw error;
    }
};
