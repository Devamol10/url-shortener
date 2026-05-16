import "./loadEnv.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";
import redirectUrl from "./controllers/urlController.js";
import errorHandler from "./middlewares/errorHandler.js";
import passport from "./config/passport.js";

// env
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === "production";

// env validation
const requiredAlways = ["MONGO_URI", "ACCESS_TOKEN_SECRET"];

const requiredProd = [
  "CLIENT_URL",
  "BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "BrevoApiKey",   // required for email verification
  "EMAIL_FROM",    // required for email sender identity
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


// root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "LinkMint API is running",
    health: "/health",
    frontend: process.env.CLIENT_URL || "http://localhost:5173"
  });
});

// health check — placed BEFORE rate limiters so monitoring pings are never throttled
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// security middleware
app.use(helmet());

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use(passport.initialize());
app.use(morgan(isProd ? "combined" : "dev"));


// auth rate limiter
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isProd ? 15 : 1000,
  message: { message: "Too many authentication requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", urlRoutes);
// legacy health alias
app.get("/api/health", (req, res) => res.redirect(301, "/health"));
// catch unmatched /api/* paths before the short-code wildcard
app.use("/api", (req, res) =>
  res.status(404).json({ message: "API route not found" })
);
app.get("/:shortCode", redirectUrl);

// error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
    );
  });
}

export default app;
