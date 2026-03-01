import { before, after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

// Ensure env is ready before app import
let app;
let mongod;
let passportInstance;

const loadApp = async () => {
  return (await import("../server.js")).default;
};

before(async () => {
  mongod = await MongoMemoryServer.create();

  process.env.MONGO_URI = mongod.getUri();
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.BASE_URL = "http://localhost:5000";
  process.env.SESSION_SECRET = "test_session_secret";
  process.env.NODE_ENV = "test";
  process.env.GOOGLE_CLIENT_ID = "dummy-google-id";
  process.env.GOOGLE_CLIENT_SECRET = "dummy-google-secret";
  process.env.GITHUB_CLIENT_ID = "dummy-github-id";
  process.env.GITHUB_CLIENT_SECRET = "dummy-github-secret";

  app = await loadApp();
  passportInstance = (await import("../config/passport.js")).default;
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

describe("Email validation & normalization", () => {
  it("rejects invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/request-verification")
      .send({ email: "bad@@example" });

    assert.equal(res.status, 400);
    assert.match(res.body.message || "", /invalid email format/i);
  });

  it("trims + lowercases email before storing", async () => {
    const rawEmail = "  USER@Example.COM  ";

    const res = await request(app)
      .post("/api/auth/request-verification")
      .send({ email: rawEmail });

    assert.equal(res.status, 200);

    const users = await mongoose.connection
      .collection("users")
      .find({ email: "user@example.com" })
      .toArray();

    assert.equal(users.length, 1);
  });
});

describe("Login and password rules", () => {
  it("blocks login when email not verified", async () => {
    const hashed = await bcrypt.hash("Pass1234", 10);
    await mongoose.connection.collection("users").insertOne({
      email: "unverified@example.com",
      password: hashed,
      isVerified: false,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "unverified@example.com", password: "Pass1234" });

    assert.equal(res.status, 403);
    assert.match(res.body.message || "", /verify your email/i);
  });

  it("rejects weak passwords on set-password", async () => {
    const token = "plain-token";
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await mongoose.connection.collection("users").insertOne({
      email: "pwtest@example.com",
      isVerified: true,
      verificationToken: hashedToken,
      verificationTokenExpires: new Date(Date.now() + 5 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/auth/set-password")
      .send({ token, password: "weak" });

    assert.equal(res.status, 400);
    assert.match(res.body.message || "", /include at least one letter and one number/i);
  });
});

describe("OAuth safeguards", () => {
  it("adds state param for OAuth initiation (CSRF protection)", async () => {
    const res = await request(app).get("/api/auth/google");
    assert.equal(res.status, 302);
    const location = res.headers.location || "";
    assert.match(location, /state=/);
  });

  it("enforces HTTPS callback in production", () => {
    const result = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        "import './server/config/passport.js';",
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_ENV: "production",
          BASE_URL: "http://localhost:5000",
          GOOGLE_CLIENT_ID: "x",
          GOOGLE_CLIENT_SECRET: "x",
          GITHUB_CLIENT_ID: "x",
          GITHUB_CLIENT_SECRET: "x",
        },
      }
    );

    assert.notEqual(result.status, 0);
    const stderr = (result.stderr || "").toString();
    assert.match(stderr, /https/i);
  });

  it("rejects unverified Google email in strategy verify", async () => {
    const verify = passportInstance._strategies.google._verify;

    await new Promise((resolve) => {
      verify(
        "token",
        null,
        { emails: [{ value: "test@example.com", verified: false }], id: "gid-1", _json: {} },
        (err, user) => {
          assert.ok(err);
          assert.equal(user, null);
          resolve();
        }
      );
    });
  });

  it("blocks Google account mismatch with stored googleId", async () => {
    await mongoose.connection.collection("users").insertOne({
      email: "match@example.com",
      googleId: "orig-id",
      isVerified: true,
    });

    const verify = passportInstance._strategies.google._verify;

    await new Promise((resolve) => {
      verify(
        "token",
        null,
        {
          emails: [{ value: "match@example.com", verified: true }],
          id: "other-id",
          _json: { email_verified: true },
        },
        (err, user) => {
          assert.ok(err);
          assert.equal(user, null);
          resolve();
        }
      );
    });
  });

  it("rejects unverified GitHub email in strategy verify", async () => {
    const verify = passportInstance._strategies.github._verify;

    await new Promise((resolve) => {
      verify(
        "token",
        null,
        {
          emails: [{ value: "gh@example.com", verified: false }],
          id: "gh-id",
          _json: { verified: false },
        },
        (err, user) => {
          assert.ok(err);
          assert.equal(user, null);
          resolve();
        }
      );
    });
  });

  it("blocks GitHub account mismatch with stored githubId", async () => {
    await mongoose.connection.collection("users").insertOne({
      email: "ghmatch@example.com",
      githubId: "orig-gh-id",
      isVerified: true,
    });

    const verify = passportInstance._strategies.github._verify;

    await new Promise((resolve) => {
      verify(
        "token",
        null,
        {
          emails: [{ value: "ghmatch@example.com", verified: true }],
          id: "other-gh-id",
          _json: { email: "ghmatch@example.com", verified: true },
        },
        (err, user) => {
          assert.ok(err);
          assert.equal(user, null);
          resolve();
        }
      );
    });
  });
});

describe("Rate limit", () => {
  it("hits 429 after exceeding limit window", async () => {
    let status429 = false;

    for (let i = 0; i < 205; i++) {
      const res = await request(app)
        .post("/api/auth/request-verification")
        .send({ email: `user${i}@example.com` });

      if (res.status === 429) {
        status429 = true;
        break;
      }
    }

    assert.equal(status429, true, "Expected to see HTTP 429 from rate limiter");
  });
});

describe("Token storage", () => {
  it("does not store raw access or refresh tokens on login", async () => {
    const hashed = await bcrypt.hash("Pass1234", 10);
    await mongoose.connection.collection("users").insertOne({
      email: "secure@example.com",
      password: hashed,
      isVerified: true,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "secure@example.com", password: "Pass1234" });

    assert.equal(res.status, 200);

    const user = await mongoose.connection
      .collection("users")
      .findOne({ email: "secure@example.com" });

    assert.ok(!("access_token" in user));
    assert.ok(!("refresh_token" in user));
    assert.ok(user.refreshToken);
    assert.equal(typeof user.refreshToken, "string");
    assert.equal(user.refreshToken.length, 64); // sha256 hex
  });
});
