import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user.js";


const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const isProd = process.env.NODE_ENV === "production";

if (isProd && !BASE_URL.startsWith("https://")) {
  throw new Error("BASE_URL must use HTTPS in production for OAuth callbacks");
}

const normalizeEmail = (value = "") =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`,
      state: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile?.emails?.length) {
          return done(new Error("Google email not found"), null);
        }

        const { value: email, verified } = profile.emails[0];
        const emailVerified =
          verified === true || profile._json?.email_verified === true;
        const normalizedEmail = normalizeEmail(email);
        const googleId = profile.id;

        if (!normalizedEmail || !emailVerified) {
          return done(new Error("Google email not verified"), null);
        }

        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
          user = await User.create({
            email: normalizedEmail,
            googleId,
            providers: ["google"],
            isVerified: true,
          });
        } else {
          if (user.googleId && user.googleId !== googleId) {
            return done(new Error("Google account mismatch for this email"), null);
          }

          if (!user.googleId) {
            user.googleId = googleId;
            user.providers = [...new Set([...(user.providers || []), "google"])];
            await user.save();
          }
        }
        done(null, user);
      } catch (err) {
        console.error("Google Auth Error:", err.message);
        done(null, false);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/github/callback`,
      state: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : profile._json?.email;

        let resolvedEmail = normalizeEmail(email);
        let emailVerified =
          (profile.emails && profile.emails[0]?.verified === true) ||
          profile._json?.verified === true;

        if (!resolvedEmail) {
          const fetched = await fetchGithubPrimaryEmail(accessToken);
          resolvedEmail = fetched?.email;
          emailVerified = fetched?.verified;
        }

        if (!resolvedEmail || !emailVerified) {
          return done(new Error("GitHub email not verified"), null);
        }

        let user = await User.findOne({ email: resolvedEmail });

        if (user) {
          if (user.githubId && user.githubId !== profile.id) {
            return done(new Error("GitHub account mismatch for this email"), null);
          }

          if (!user.githubId) {
            user.githubId = profile.id;
            user.providers = [...new Set([...(user.providers || []), "github"])];
            await user.save();
          }
        } else {
          user = await User.create({
            email: resolvedEmail,
            githubId: profile.id,
            providers: ["github"],
            isVerified: true,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

const fetchGithubPrimaryEmail = async (accessToken) => {
  try {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${accessToken}`,
        "User-Agent": "url-shortner-app",
      },
    });

    if (!response.ok) {
      console.error("GitHub email fetch failed:", response.status);
      return null;
    }

    const emails = await response.json();
    const primary =
      emails.find((e) => e.primary && e.verified) ||
      emails.find((e) => e.verified) ||
      null;

    if (!primary?.email || primary.verified !== true) {
      return null;
    }

    return {
      email: normalizeEmail(primary.email),
      verified: primary.verified === true,
    };
  } catch (err) {
    console.error("GitHub email fetch error:", err.message);
    return null;
  }
};

export default passport;
