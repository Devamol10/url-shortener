import jwt from "jsonwebtoken";
import asyncHandler from "./asyncHandler.js";

// required auth
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  const token = bearerToken || req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
});

export const optionalProtect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  const token = bearerToken || req.cookies?.accessToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.userId = decoded.userId;
  } catch (error) {
    req.userId = undefined;
  }

  next();
});
