import jwt from "jsonwebtoken";
import crypto from "crypto";

const getAccessSecret = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      "ACCESS_TOKEN_SECRET is missing in environment variables."
    );
  }

  return secret;
};

const ACCESS_TOKEN_EXPIRY = "15m";

// access token (JWT)
export const generateAccessToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required to generate access token.");
  }

  return jwt.sign(
    { userId },
    getAccessSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// refresh token (random string)
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

// hash refresh token
export const hashRefreshToken = (token) => {
  if (!token) {
    throw new Error("Refresh token is required for hashing.");
  }

  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};
