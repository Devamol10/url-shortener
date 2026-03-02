import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";
import redirectUrl from "./controllers/urlController.js";
import errorHandler from "./middlewares/errorHandler.js";
import passport from "./config/passport.js";

// env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const isProd = process.env.NODE_ENV === "production";

// env validation
const requiredAlways = ["MONGO_URI", "SESSION_SECRET", "ACCESS_TOKEN_SECRET"];

const requiredProd = [
  "CLIENT_URL",
  "BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
];

const missingAlways = requiredAlways.filter((key) => !process.env[key]);
if (missingAlways.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingAlways.join(", ")}`
  );
}

if (isProd) {
  const missingProd = requiredProd.filter((key) => !process.env[key]);
  if (missingProd.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingProd.join(", ")}`
    );
  }

  if (process.env.SESSION_SECRET.length < 64) {
    throw new Error("SESSION_SECRET must be at least 64 characters in production");
  }
  if (process.env.ACCESS_TOKEN_SECRET.length < 64) {
    throw new Error("ACCESS_TOKEN_SECRET must be at least 64 characters in production");
  }
}

// app init
const app = express();

if (isProd) {
  app.set("trust proxy", 1);
}

connectDB();

const mongoUri = process.env.MONGO_URI;

// security middleware
app.use(helmet());

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://linkmint-short-url.netlify.app"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: mongoUri
      ? MongoStore.create({
        mongoUrl: mongoUri,
        ttl: 10 * 60,
      })
      : undefined,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 10 * 60 * 1000,
    },
    name: "sid",
  })
);
console.log("NODE_ENV is:", process.env.NODE_ENV);

app.use(passport.initialize());
app.use(morgan(isProd ? "combined" : "dev"));

// auth rate limiter
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: { message: "Too many authentication requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", urlRoutes);
app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/:shortCode", redirectUrl);

// error handler
app.use(errorHandler);

// server start
// server start
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
    );
  });
}

export default app;
