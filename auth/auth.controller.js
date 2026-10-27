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
import ApiResponse from "../utils/ApiResponse.js";
import config from "../config/env.js";

const ACCESS_SECRET = config.jwt.accessSecret;
const REFRESH_SECRET = config.jwt.refreshSecret;

const ACCESS_EXPIRES_IN = config.jwt.accessExpiresIn;
const REFRESH_EXPIRES_IN = config.jwt.refreshExpiresIn;

const REFRESH_COOKIE = "refreshToken";

const cookieOptions = {
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
    { expiresIn: ACCESS_EXPIRES_IN }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { sub: String(user.id), jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

const getRefreshExpiry = (token) => {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded.exp !== "number") {
    throw new ApiError(500, "Could not create refresh token.");
  }

  return new Date(decoded.exp * 1000);
};

const issueTokens = async (user, res) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  await saveRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshExpiry(refreshToken),
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: Math.max(
      0,
      getRefreshExpiry(refreshToken).getTime() - Date.now()
    ),
  });

  return accessToken;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

export const register = async (req, res) => {
  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new ApiError(409, "Email is already registered.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;

  try {
    user = await createUser({
      name,
      email,
      passwordHash,
    });
  } catch (error) {

    if (error.code === "23505") {
      throw new ApiError(409, "Email is already registered.");
    }

    throw error;
  }

  const accessToken = await issueTokens(user, res);

  return res.status(201).json(
    new ApiResponse(201, "Registration successful.", {
      user: publicUser(user),
      accessToken,
    })
  );
};

export const login = async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const user = await findUserByEmail(email);

  if (
    !user ||
    !(await bcrypt.compare(password, user.password_hash))
  ) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const accessToken = await issueTokens(user, res);

  return res.status(200).json(
    new ApiResponse(200, "Login successful.", {
      user: publicUser(user),
      accessToken,
    })
  );
};

export const getMe = async (req, res) => {
  const user = await findUserById(req.user.id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return res.status(200).json(
    new ApiResponse(200, "Profile retrieved successfully.", {
      user: publicUser(user),
    })
  );
};

export const refresh = async (req, res) => {
  const oldToken = req.cookies?.[REFRESH_COOKIE];

  if (!oldToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  let decoded;

  try {
    decoded = jwt.verify(oldToken, REFRESH_SECRET);
  } catch {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  if (
    typeof decoded === "string" ||
    !decoded.sub ||
    !decoded.jti
  ) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new ApiError(401, "Invalid refresh token.");
  }

  const consumed = await consumeRefreshToken(hashToken(oldToken));

  if (!consumed || String(consumed.user_id) !== String(decoded.sub)) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new ApiError(401, "Refresh token has expired or been revoked.");
  }

  const user = await findUserById(consumed.user_id);

  if (!user) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw new ApiError(401, "User no longer exists.");
  }

  const accessToken = await issueTokens(user, res);

  return res.status(200).json(
    new ApiResponse(200, "Tokens refreshed successfully.", {
      accessToken,
    })
  );
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (refreshToken) {

    await revokeRefreshToken(hashToken(refreshToken));
  }

  res.clearCookie(REFRESH_COOKIE, cookieOptions);

  return res.status(200).json(
    new ApiResponse(200, "Logout successful.")
  );
};
