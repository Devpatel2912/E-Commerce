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

const AuthController = {
    register: async (req, res, next) => {
        try {
            const { name, email, password } = req.body;
            const {
                user,
                accessToken,
                refreshToken,
                cookieOptions: resCookieOptions,
            } = await registerService({ name, email, password });

            res.cookie(REFRESH_COOKIE, refreshToken, resCookieOptions);

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
            const {
                user,
                accessToken,
                refreshToken,
                cookieOptions: resCookieOptions,
            } = await loginService({ email, password });

            res.cookie(REFRESH_COOKIE, refreshToken, resCookieOptions);

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
            const {
                accessToken,
                refreshToken,
                cookieOptions: resCookieOptions,
            } = await refreshService(oldToken);

            res.cookie(REFRESH_COOKIE, refreshToken, resCookieOptions);

            return res.status(200).json(
                new ApiResponse(200, "Tokens refreshed successfully.", {
                    accessToken,
                }),
            );
        } catch (error) {
            res.clearCookie(REFRESH_COOKIE, cookieOptions);
            next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE];
            const { cookieOptions: clearOptions } =
                await logoutService(refreshToken);

            res.clearCookie(REFRESH_COOKIE, clearOptions);

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
