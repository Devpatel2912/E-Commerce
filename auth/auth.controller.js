import {
    registerService,
    loginService,
    getMeService,
    refreshService,
    logoutService,
    REFRESH_COOKIE,
    cookieOptions,
} from "./auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../config/logger.js";

const AuthController = {
    register: async (req, res, next) => {
        try {
            const { name, email, password } = req.body;
            logger.info({ email }, "Processing user registration request.");

            const {
                user,
                accessToken,
                refreshToken,
                cookieOptions: resCookieOptions,
            } = await registerService({ name, email, password });

            res.cookie(REFRESH_COOKIE, refreshToken, resCookieOptions);

            logger.info(
                { userId: user.id, email: user.email },
                "User registered successfully.",
            );

            return res.status(201).json(
                new ApiResponse(201, "Registration successful.", {
                    user,
                    accessToken,
                }),
            );
        } catch (error) {
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            logger.info({ email }, "Processing user login request.");

            const {
                user,
                accessToken,
                refreshToken,
                cookieOptions: resCookieOptions,
            } = await loginService({ email, password });

            res.cookie(REFRESH_COOKIE, refreshToken, resCookieOptions);

            logger.info(
                { userId: user.id, email: user.email },
                "User logged in successfully.",
            );

            return res.status(200).json(
                new ApiResponse(200, "Login successful.", {
                    user,
                    accessToken,
                }),
            );
        } catch (error) {
            next(error);
        }
    },

    getMe: async (req, res, next) => {
        try {
            const userId = req.user?.id ?? req.user?.user_id;
            logger.debug({ userId }, "Fetching current user profile.");
            const data = await getMeService(userId);

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        "Profile retrieved successfully.",
                        data,
                    ),
                );
        } catch (error) {
            next(error);
        }
    },

    refresh: async (req, res, next) => {
        try {
            const oldToken = req.cookies?.[REFRESH_COOKIE];
            logger.debug("Processing token refresh request.");

            const {
                accessToken,
                refreshToken,
                cookieOptions: resCookieOptions,
            } = await refreshService(oldToken);

            res.cookie(REFRESH_COOKIE, refreshToken, resCookieOptions);

            logger.info("Tokens refreshed successfully.");

            return res.status(200).json(
                new ApiResponse(200, "Tokens refreshed successfully.", {
                    accessToken,
                }),
            );
        } catch (error) {
            logger.warn("Token refresh failed. Clearing refresh cookie.");
            res.clearCookie(REFRESH_COOKIE, cookieOptions);
            next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE];
            logger.info("Processing user logout request.");

            const { cookieOptions: clearOptions } =
                await logoutService(refreshToken);

            res.clearCookie(REFRESH_COOKIE, clearOptions);

            logger.info("User logged out successfully.");

            return res
                .status(200)
                .json(new ApiResponse(200, "Logout successful."));
        } catch (error) {
            next(error);
        }
    },
};

export const { register, login, getMe, refresh, logout } = AuthController;

export default AuthController;
