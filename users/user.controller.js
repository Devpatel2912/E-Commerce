import {
  findUserById,
  updateUser,
  deleteUser,
  findUsers,
} from "./user.model.js";
import logger from "../config/logger.js";

export const getUsers = async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination;
    const users = await findUsers(limit, offset);

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
    logger.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieved users",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await findUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      data: user,
    });
  } catch (error) {
    logger.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user.",
    });
  }
};

export const patchUser = async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email address is already in use.",
      });
    }

    logger.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
};

export const removeUser = async (req, res) => {
  try {
    const deletedUser = await deleteUser(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User account deleted successfully.",
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This account has related records and cannot be deleted directly.",
      });
    }

    logger.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user.",
    });
  }
};
