import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
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

  const existingUser = await User.findOne({ email:normalizedEmail });

  if (existingUser && existingUser.isVerified) {
    return res.status(409).json({
      message: "Account already exists. Please login."
    });
  }


  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  const tokenExpiry = new Date(Date.now() + 7 * 60 * 1000);

  let user = existingUser;

if (!existingUser) {
  user = await User.create({
    email: normalizedEmail,
    verificationToken: hashedToken,
    verificationTokenExpires: tokenExpiry,
  });
} else {
  user = existingUser;
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
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 20px;">
    <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); text-align: center;">
      
      <h2 style="color: #333; margin-bottom: 10px;">Email Verification</h2>
      
      <p style="color: #555; font-size: 14px; margin-bottom: 25px;">
        Please click the button below to verify your email address.
      </p>

      <a href="${verificationUrl}" 
         style="display: inline-block; padding: 12px 25px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
        Verify Email
      </a>

      <p style="color: #888; font-size: 12px; margin-top: 25px;">
        This link expires in 7 minutes.
      </p>

      <hr style="margin: 25px 0; border: none; border-top: 1px solid #eee;" />

      <p style="color: #aaa; font-size: 11px;">
        If you did not request this, you can safely ignore this email.
      </p>

    </div>
  </div>
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

  const isBlacklisted = await BlacklistedToken.findOne({ token: hashedToken });
  if (isBlacklisted) {
    clearAuthCookies(res);
    return res.status(401).json({
      message: "Session expired or revoked. Please login again.",
    });
  }

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

    const user = await User.findOne({ refreshToken: hashedToken });

    // add to blacklist so the token cannot be reused
    if (user && user.refreshTokenExpires) {
      await BlacklistedToken.create({
        token: hashedToken,
        expiresAt: user.refreshTokenExpires,
      });
    } else {
      await BlacklistedToken.create({
        token: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }

    await User.findOneAndUpdate(
      { refreshToken: hashedToken },
      { refreshToken: null, refreshTokenExpires: null }
    );
  }

  clearAuthCookies(res);

  res.status(200).json({
    message: "Logged out successfully",
  });
});
