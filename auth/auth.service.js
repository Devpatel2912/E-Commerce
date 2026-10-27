import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import {
    createUser,
    findUserByEmail,
    findUserById,
} from "../users/user.model.js";

import {
    saveRefreshToken,
    consumeRefreshToken,
    revokeRefreshToken,
} from "./auth.model.js";

import ApiError from "../utils/ApiError.js";
import config from "../config/env.js";

const ACCESS_SECRET = config.jwt.accessSecret;
const REFRESH_SECRET = config.jwt.refreshSecret;

const ACCESS_EXPIRES_IN = config.jwt.accessExpiresIn;
const REFRESH_EXPIRES_IN = config.jwt.refreshExpiresIn;

export const REFRESH_COOKIE = "refreshToken";

export const cookieOptions = {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: "/api/v1/auth",
};

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const createAccessToken = (user) =>
    jwt.sign(
        { sub: String(user.id), email: user.email, role: user.role || "user" },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN },
    );

const createRefreshToken = (user) =>
    jwt.sign(
        { sub: String(user.id), jti: crypto.randomUUID() },
        REFRESH_SECRET,
        {
            expiresIn: REFRESH_EXPIRES_IN,
        },
    );

const getRefreshExpiry = (token) => {
    const decoded = jwt.decode(token);

    if (!decoded || typeof decoded.exp !== "number") {
        throw new ApiError(500, "Could not create refresh token.");
    }

    return new Date(decoded.exp * 1000);
};

const issueTokens = async (user) => {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    const expiresAt = getRefreshExpiry(refreshToken);

    await saveRefreshToken({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
    });

    const resolvedCookieOptions = {
        ...cookieOptions,
        maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
    };

    return {
        accessToken,
        refreshToken,
        cookieOptions: resolvedCookieOptions,
    };
};

const formatPublicUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
});

export const registerService = async ({ name, email, password }) => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
        throw new ApiError(409, "Email is already registered.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let user;
    try {
        user = await createUser({
            name: normalizedName,
            email: normalizedEmail,
            passwordHash,
        });
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(409, "Email is already registered.");
        }
        throw error;
    }

    const tokens = await issueTokens(user);

    return {
        user: formatPublicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        cookieOptions: tokens.cookieOptions,
    };
};

export const loginService = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await findUserByEmail(normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new ApiError(401, "Invalid email or password.");
    }

    const tokens = await issueTokens(user);

    return {
        user: formatPublicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        cookieOptions: tokens.cookieOptions,
    };
};

export const getMeService = async (userId) => {
    const user = await findUserById(userId);
    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    return {
        user: formatPublicUser(user),
    };
};

export const refreshService = async (oldToken) => {
    if (!oldToken) {
        throw new ApiError(401, "Refresh token is required.");
    }

    let decoded;
    try {
        decoded = jwt.verify(oldToken, REFRESH_SECRET);
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token.");
    }

    if (typeof decoded === "string" || !decoded.sub || !decoded.jti) {
        throw new ApiError(401, "Invalid refresh token.");
    }

    const consumed = await consumeRefreshToken(hashToken(oldToken));
    if (!consumed || String(consumed.user_id) !== String(decoded.sub)) {
        throw new ApiError(401, "Refresh token has expired or been revoked.");
    }

    const user = await findUserById(consumed.user_id);
    if (!user) {
        throw new ApiError(401, "User no longer exists.");
    }

    const tokens = await issueTokens(user);

    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        cookieOptions: tokens.cookieOptions,
    };
};

export const logoutService = async (refreshToken) => {
    if (refreshToken) {
        await revokeRefreshToken(hashToken(refreshToken));
    }

    return {
        cookieOptions,
    };
};
