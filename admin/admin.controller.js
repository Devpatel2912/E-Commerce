import {
    listUsersService,
    getUserByIdService,
    editUserService,
    deleteUserService,
    listRefundsService,
    getRefundByIdService,
    issueRefundService,
    updateRefundStatusService,
} from "./admin.service.js";

export const listUsers = async (req, res, next) => {
    try {
        const { page, limit, offset } = req.pagination;
        const { search, role } = req.query;

        const { users, total, totalPages } = await listUsersService({
            limit,
            offset,
            search,
            role,
        });

        return res.status(200).json({
            success: true,
            message: "Users retrieved successfully.",
            pagination: {
                page,
                limit,
                total,
                totalPages,
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
        const user = await getUserByIdService(req.validatedId);

        return res.status(200).json({
            success: true,
            message: "User details retrieved successfully.",
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const editUser = async (req, res, next) => {
    try {
        const updatedUser = await editUserService(
            req.validatedId,
            req.validatedUserUpdate,
        );

        return res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: updatedUser,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const deletedUser = await deleteUserService({
            targetId: req.validatedId,
            currentAdminId: req.user?.id,
        });

        return res.status(200).json({
            success: true,
            message: "User account deleted successfully.",
            data: deletedUser,
        });
    } catch (error) {
        next(error);
    }
};

export const listRefunds = async (req, res, next) => {
    try {
        const { page, limit, offset } = req.pagination;
        const { status, user_id } = req.query;

        const { refunds, total, totalPages } = await listRefundsService({
            status,
            userId: user_id,
            limit,
            offset,
        });

        return res.status(200).json({
            success: true,
            message: "Refunds retrieved successfully.",
            pagination: {
                page,
                limit,
                total,
                totalPages,
                count: refunds.length,
            },
            data: refunds,
        });
    } catch (error) {
        next(error);
    }
};

export const getRefundById = async (req, res, next) => {
    try {
        const refund = await getRefundByIdService(req.validatedId);

        return res.status(200).json({
            success: true,
            message: "Refund details retrieved successfully.",
            data: refund,
        });
    } catch (error) {
        next(error);
    }
};

export const issueRefund = async (req, res, next) => {
    try {
        const refund = await issueRefundService(req.validatedRefund);

        return res.status(201).json({
            success: true,
            message: "Refund issued successfully.",
            data: refund,
        });
    } catch (error) {
        next(error);
    }
};

export const updateRefundStatus = async (req, res, next) => {
    try {
        const updatedRefund = await updateRefundStatusService(
            req.validatedId,
            req.validatedStatusUpdate,
        );

        return res.status(200).json({
            success: true,
            message: `Refund status updated to '${updatedRefund.status}'.`,
            data: updatedRefund,
        });
    } catch (error) {
        next(error);
    }
};
