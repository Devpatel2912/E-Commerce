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

export const listUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { search, role } = req.query;

    const { users, total } = await getAdminUsers({
      limit,
      offset,
      search,
      role,
    });

    const totalPages = Math.ceil(total / limit) || 1;

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
    const user = await getAdminUserById(req.validatedId);

    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

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
    const updatedUser = await updateAdminUser(
      req.validatedId,
      req.validatedUserUpdate,
    );

    if (!updatedUser) {
      return next(new ApiError(404, "User not found."));
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    if (error.code === "23505") {
      return next(
        new ApiError(
          409,
          "Email address is already in use by another account.",
        ),
      );
    }
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (String(req.user?.id) === String(req.validatedId)) {
      return next(
        new ApiError(400, "You cannot delete your own admin account."),
      );
    }

    const deletedUser = await deleteAdminUser(req.validatedId);

    if (!deletedUser) {
      return next(new ApiError(404, "User not found."));
    }

    return res.status(200).json({
      success: true,
      message: "User account deleted successfully.",
      data: deletedUser,
    });
  } catch (error) {
    if (error.code === "23503") {
      return next(
        new ApiError(
          409,
          "This account has dependent database records that prevent direct deletion.",
        ),
      );
    }
    next(error);
  }
};

export const listRefunds = async (req, res, next) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { status, user_id } = req.query;

    const { refunds, total } = await getAdminRefunds({
      status,
      userId: user_id ? Number(user_id) : null,
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit) || 1;

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
    const refund = await getAdminRefundById(req.validatedId);

    if (!refund) {
      return next(new ApiError(404, "Refund record not found."));
    }

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
    const refund = await createAdminRefund(req.validatedRefund);

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
    const updatedRefund = await updateAdminRefundStatus(
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
