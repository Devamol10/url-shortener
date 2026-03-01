import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import { sendEmail } from "../utils/sendEmail.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/generateTokens.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookieHelpers.js";

// helpers
const normalizeEmail = (value = "") =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isStrongPassword = (value = "") =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

// request verification
export const requestVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  const tokenExpiry = new Date(Date.now() + 7 * 60 * 1000);

  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      verificationToken: hashedToken,
      verificationTokenExpires: tokenExpiry,
    });
  } else {
    user.verificationToken = hashedToken;
    user.verificationTokenExpires = tokenExpiry;
    await user.save();
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  const verificationUrl = `${baseUrl}/api/auth/verify/${rawToken}`;

  await sendEmail({
    to: normalizedEmail,
    subject: "Verify Your Email",
    html: `
      <h2>Email Verification</h2>
      <p>Click below to verify your email:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link expires in 7 minutes.</p>
    `,
  });

  res.status(200).json({
    message: "Verification email sent",
  });
});

// verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.redirect(`${process.env.CLIENT_URL}/verification-failed`);
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.redirect(`${process.env.CLIENT_URL}/verification-failed`);
  }

  user.isVerified = true;
  await user.save();

  return res.redirect(
    `${process.env.CLIENT_URL}/create-password?token=${token}`
  );
});

// set password + auto login
export const setPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      message: "Token and password are required",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user || !user.isVerified) {
    return res.status(400).json({
      message: "Invalid or expired token",
    });
  }

  const trimmedPassword = password.trim();

  if (!isStrongPassword(trimmedPassword)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters and include at least one letter and one number",
    });
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(trimmedPassword, salt);

  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashRefreshToken(refreshToken);

  user.refreshToken = hashedRefreshToken;
  user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: "Password set successfully. Logged in automatically.",
    token: accessToken,
  });
});

// login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = typeof password === "string" ? password.trim() : "";

  if (!normalizedEmail || !trimmedPassword) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.password) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      message: "Please verify your email first",
    });
  }

  const isMatch = await bcrypt.compare(trimmedPassword, user.password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashRefreshToken(refreshToken);

  user.refreshToken = hashedRefreshToken;
  user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: "Login successful",
    token: accessToken,
  });
});

// refresh token (rotation)
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({
      message: "Refresh token missing",
    });
  }

  const hashedToken = hashRefreshToken(token);

  const user = await User.findOne({
    refreshToken: hashedToken,
    refreshTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    clearAuthCookies(res);
    return res.status(403).json({
      message: "Invalid or expired refresh token. Please login again.",
    });
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken();
  const newHashedRefreshToken = hashRefreshToken(newRefreshToken);

  user.refreshToken = newHashedRefreshToken;
  user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  setAuthCookies(res, newAccessToken, newRefreshToken);

  res.status(200).json({
    message: "Access token refreshed",
    token: newAccessToken,
  });
});

// logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    const hashedToken = hashRefreshToken(token);
    await User.findOneAndUpdate(
      { refreshToken: hashedToken },
      { refreshToken: null }
    );
  }

  clearAuthCookies(res);

  res.status(200).json({
    message: "Logged out successfully",
  });
});
