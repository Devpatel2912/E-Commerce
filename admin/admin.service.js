import {
    getAdminUsers,
    getAdminUserById,
    updateAdminUser,
    deleteAdminUser,
    getAdminRefunds,
    getAdminRefundById,
    createAdminRefund,
    updateAdminRefundStatus,
} from "./admin.model.js";
import ApiError from "../utils/ApiError.js";

export const listUsersService = async ({ limit, offset, search, role }) => {
    const { users, total } = await getAdminUsers({
        limit,
        offset,
        search,
        role,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        users,
        total,
        totalPages,
    };
};

export const getUserByIdService = async (id) => {
    const user = await getAdminUserById(id);
    if (!user) {
        throw new ApiError(404, "User not found.");
    }
    return user;
};

export const editUserService = async (id, updateData) => {
    try {
        const updatedUser = await updateAdminUser(id, updateData);
        if (!updatedUser) {
            throw new ApiError(404, "User not found.");
        }
        return updatedUser;
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(
                409,
                "Email address is already in use by another account.",
            );
        }
        throw error;
    }
};

export const deleteUserService = async ({ targetId, currentAdminId }) => {
    if (String(currentAdminId) === String(targetId)) {
        throw new ApiError(400, "You cannot delete your own admin account.");
    }

    try {
        const deletedUser = await deleteAdminUser(targetId);
        if (!deletedUser) {
            throw new ApiError(404, "User not found.");
        }
        return deletedUser;
    } catch (error) {
        if (error.code === "23503") {
            throw new ApiError(
                409,
                "This account has dependent database records that prevent direct deletion.",
            );
        }
        throw error;
    }
};

export const listRefundsService = async ({ status, userId, limit, offset }) => {
    const { refunds, total } = await getAdminRefunds({
        status,
        userId: userId ? Number(userId) : null,
        limit,
        offset,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        refunds,
        total,
        totalPages,
    };
};

export const getRefundByIdService = async (id) => {
    const refund = await getAdminRefundById(id);
    if (!refund) {
        throw new ApiError(404, "Refund record not found.");
    }
    return refund;
};

export const issueRefundService = async (refundData) => {
    return await createAdminRefund(refundData);
};

export const updateRefundStatusService = async (id, statusUpdate) => {
    const updatedRefund = await updateAdminRefundStatus(id, statusUpdate);
    if (!updatedRefund) {
        throw new ApiError(404, "Refund record not found.");
    }
    return updatedRefund;
};
