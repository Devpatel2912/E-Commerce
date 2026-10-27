import { Router } from "express";

import AuthController from "./auth.controller.js";

import { registerValidator, loginValidator } from "./auth.validation.js";

import validate from "../middleware/validate.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

router.post(
    "/register",
    authLimiter,
    validate(registerValidator),
    AuthController.register,
);
router.post(
    "/login",
    authLimiter,
    validate(loginValidator),
    AuthController.login,
);
router.get("/me", authMiddleware, AuthController.getMe);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

export default router;
