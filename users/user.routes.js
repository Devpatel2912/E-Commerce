import { Router } from "express";

import {
  getUsers,
  getUserById,
  patchUser,
  removeUser,
} from "./user.controller.js";

import {
  authenticateUSer,
  requiedOwnUser,
} from "./user.middleware.js";

import {
  validateUpdateUser,
  validateUserId,
  validatePagination,
} from "./user.validation.js";

const router = Router();

router.use(authenticateUSer);

router.get("/", validatePagination, getUsers);

router.get(
  "/:id",
  validateUserId,
  requiedOwnUser,
  getUserById
);

router.patch(
  "/:id",
  validateUserId,
  requiedOwnUser,
  validateUpdateUser,
  patchUser
);

router.delete(
  "/:id",
  validateUserId,
  requiedOwnUser,
  removeUser
);

export default router;
