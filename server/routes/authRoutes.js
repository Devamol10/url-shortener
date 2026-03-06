import express from "express";
import rateLimit from "express-rate-limit";
import passport from "../config/passport.js";
import {
  generateAccessToken as generateToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/generateTokens.js";
import { setAuthCookies } from "../utils/cookieHelpers.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  requestVerification,
  verifyEmail,
  setPassword,
  refreshToken,
  login,
  logout,
} from "../controllers/authcontroller.js";
import User from "../models/user.js";

const router = express.Router();

// rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many verification requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many refresh attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// oauth: google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/register",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
      }

      const accessToken = generateToken(user._id);
      const refreshTkn = generateRefreshToken();
      user.refreshToken = hashRefreshToken(refreshTkn);
      user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();
      setAuthCookies(res, accessToken, refreshTkn);

      return res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    })(req, res, next);
  }
);

// oauth: github
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/register",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  (req, res, next) => {
    passport.authenticate("github", { session: false }, async (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
      }

      const accessToken = generateToken(user._id);
      const refreshTkn = generateRefreshToken();
      user.refreshToken = hashRefreshToken(refreshTkn);
      user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();
      setAuthCookies(res, accessToken, refreshTkn);

      return res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    })(req, res, next);
  }
);

// auth status
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(401).json({
      message: "User not found",
    });
  }

  res.status(200).json({
    userId: user._id,
    email: user.email,
    isVerified: user.isVerified,
  });
});

// email verification
router.post("/request-verification", verificationLimiter, requestVerification);
router.get("/verify/:token", verifyEmail);
router.post("/set-password", verificationLimiter, setPassword);

// auth flow
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refreshToken);
router.post("/logout", logout);

export default router;
