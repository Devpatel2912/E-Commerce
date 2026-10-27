import { Router } from "express";

import { register, login, getMe, refresh, logout } from "./auth.controller.js";

import { registerValidator, loginValidator } from "./auth.validation.js";

import validate from "../middleware/validate.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/register", authLimiter, validate(registerValidator), register);
router.post("/login", authLimiter, validate(loginValidator), login);
router.get("/me", authMiddleware, getMe);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
