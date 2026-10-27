import { Router } from "express";

import UserController from "./user.controller.js";

import { authenticateUSer, requiedOwnUser } from "./user.middleware.js";

import {
    validateUpdateUser,
    validateUserId,
    validatePagination,
} from "./user.validation.js";

const router = Router();

router.use(authenticateUSer);

router.get("/", validatePagination, UserController.getUsers);

router.get("/:id", validateUserId, requiedOwnUser, UserController.getUserById);

router.patch(
    "/:id",
    validateUserId,
    requiedOwnUser,
    validateUpdateUser,
    UserController.patchUser,
);

router.delete(
    "/:id",
    validateUserId,
    requiedOwnUser,
    UserController.removeUser,
);

export default router;
