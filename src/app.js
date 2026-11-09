import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import { apiLimiter, authLimiter } from "./middlewares/rateLimit.middleware.js";
import { securityHeaders } from "./middlewares/helmet.middleware.js";
import { sanitizeInput } from "./middlewares/sanitizeHtml.middleware.js";
import {
  csrfProtection,
  csrfTokenHandler,
} from "./middlewares/csrf.middleware.js";

const app = express();
app.set("trust proxy", 1); //REQUIRED for HTTPS on EB
app.disable("x-powered-by");

// MIDDLEWARE CONFIGURATION
app.use(securityHeaders);

/* cors configuration */
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, "")) // trim spaces and trailing slashes
  .filter(Boolean); // drop empty entries;

if (allowedOrigins.length === 0) {
  console.warn(
    "ALLOWED_ORIGINS is empty: all browser cross-origin requests will be rejected"
  );
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, origin); // Allow specific origins or requests without origin (e.g., from Postman)
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use("/api", apiLimiter); // limit before parsing the body
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(sanitizeInput); // strip HTML + $operators from body/query/params

// CSRF: client fetches a token once, then sends it in the X-CSRF-Token header
app.get("/api/v1/csrf-token", csrfTokenHandler);
app.use("/api", csrfProtection); // GET/HEAD/OPTIONS are ignored automatically

// Stricter limit on auth endpoints
app.use(
  [
    "/api/v1/user/login",
    "/api/v1/user/register",
    "/api/v1/user/forgot-password",
    "/api/v1/user/update/password",
  ],
  authLimiter
);

// HEALTH ROUTES
app.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});
app.get("/ready", async (req, res) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const readyState = mongoose.connection.readyState;

  if (readyState !== 1) {
    return res.status(503).json({
      status: "error",
      db: states[readyState] ?? "unknown",
    });
  }

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();

    return res.json({
      status: "ok",
      db: "connected",
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    return res.status(503).json({
      status: "error",
      db: "ping failed",
      message: err.message,
    });
  }
});

// IMPORT ROUTES
import userRouter from "./routes/user.route.js";
import channelRouter from "./routes/channel.route.js";
import videoRouter from "./routes/video.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import recommendRouter from "./routes/recommend.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import impressionRouter from "./routes/impression.route.js";
import searchRouter from "./routes/search.route.js";

// DECLARE ROUTES
app.use("/api/v1/user", userRouter);
app.use("/api/v1/channel", channelRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/recommend", recommendRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/impression", impressionRouter);
app.use("/api/v1/search", searchRouter);

// Error-handling middleware: Catches and formats custom ApiError instances or generic errors to json.
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
app.use(errorHandler);

export default app;
