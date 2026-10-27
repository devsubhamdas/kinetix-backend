import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

const app = express();
app.set("trust proxy", 1); //REQUIRED for HTTPS on EB

// MIDDLEWARE CONFIGURATION
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
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

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
import watchRouter from "./routes/watch.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import recommendRouter from "./routes/recommend.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import impressionRouter from "./routes/impression.route.js";

// health check
app.get("/", (req, res) => {
  return res.status(200).json({
    success: "ok",
  });
});

// DECLARE ROUTES
app.use("/api/v1/user", userRouter);
app.use("/api/v1/channel", channelRouter);
app.use("/api/v1/watch", watchRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/recommend", recommendRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/impression", impressionRouter);

// Error-handling middleware: Catches and formats custom ApiError instances or generic errors to json.
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
app.use(errorHandler);

export default app;
