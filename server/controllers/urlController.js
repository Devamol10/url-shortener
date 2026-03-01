import Url from "../models/url.js";
import generateShortCode from "../utils/generateShortCode.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import crypto from "crypto";

const MAX_URL_LENGTH = 2048;

const normalizeUrl = (input) => {
  if (!input) throw new Error("URL is required");

  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Invalid protocol");
  }

  return parsed.toString();
};

// create short url
export const createShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({
      message: "Original URL is required",
    });
  }

  const trimmedInput = originalUrl.trim();

  if (trimmedInput.length > MAX_URL_LENGTH) {
    return res.status(400).json({
      message: `URL must be ${MAX_URL_LENGTH} characters or fewer`,
    });
  }

  let normalizedUrl;

  try {
    normalizedUrl = normalizeUrl(trimmedInput);
  } catch (err) {
    return res.status(400).json({
      message: "Invalid URL format",
    });
  }

  const userId = req.userId;
  const ip = req.ip;

  // guest rate limit (2 free links per 24h)
  if (!userId) {
    const hashedIp = crypto
      .createHash("sha256")
      .update(ip)
      .digest("hex");

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await Url.countDocuments({
      ipAddress: hashedIp,
      createdAt: { $gte: last24Hours },
    });

    if (count >= 2) {
      return res.status(403).json({
        limitReached: true,
        message:
          "You've used your 2 free links in the last 24 hours. Please sign in to continue.",
      });
    }
  }

  // dedup for logged-in users
  if (userId) {
    const existing = await Url.findOne({
      originalUrl: normalizedUrl,
      user: userId,
    });

    if (existing) {
      return res.status(200).json({
        shortCode: existing.shortCode,
        shortUrl: `${process.env.BASE_URL || `http://${req.get("host")}`}/${existing.shortCode}`,
        originalUrl: existing.originalUrl,
      });
    }
  }

  let shortCode;
  let exists = true;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (exists) {
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(503).json({
        message: "Unable to generate a unique short code. Please try again.",
      });
    }
    shortCode = generateShortCode();
    exists = await Url.findOne({ shortCode });
    attempts++;
  }

  const hashedIp = userId
    ? undefined
    : crypto.createHash("sha256").update(ip).digest("hex");

  const doc = await Url.create({
    originalUrl: normalizedUrl,
    shortCode,
    ipAddress: hashedIp,
    user: userId || undefined,
  });

  res.status(201).json({
    shortCode: doc.shortCode,
    shortUrl: `${process.env.BASE_URL || `http://${req.get("host")}`}/${doc.shortCode}`,
    originalUrl: doc.originalUrl,
  });
});

// redirect
const redirectUrl = asyncHandler(async (req, res) => {
  const { shortCode } = req.params;

  const urlDoc = await Url.findOneAndUpdate(
    { shortCode },
    { $inc: { clicks: 1 } },
    { new: false }
  );

  if (!urlDoc) {
    return res.status(404).json({
      message: "URL not found",
    });
  }

  return res.redirect(urlDoc.originalUrl);
});

export default redirectUrl;

// get url stats
export const getUrlStats = asyncHandler(async (req, res) => {
  const { shortCode } = req.params;

  const doc = await Url.findOne({ shortCode });

  if (!doc) {
    return res.status(404).json({
      message: "URL not found",
    });
  }

  res.status(200).json({
    originalUrl: doc.originalUrl,
    shortCode: doc.shortCode,
    clicks: doc.clicks,
    createdAt: doc.createdAt,
  });
});

// get my urls
export const getMyUrls = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const urls = await Url.find({ user: userId })
    .sort({ createdAt: -1 })
    .select("-ipAddress");

  res.status(200).json(urls);
});

// delete url
export const deleteUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const url = await Url.findById(id);

  if (!url) {
    return res.status(404).json({
      message: "URL not found",
    });
  }

  if (!url.user || url.user.toString() !== userId) {
    return res.status(403).json({
      message: "Not authorized to delete this URL",
    });
  }

  await url.deleteOne();

  res.status(200).json({
    message: "URL deleted successfully",
  });
});
