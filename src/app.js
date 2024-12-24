import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// MIDDLEWARE CONFIGURATION
const allowedOrigins = ["http://localhost:5173", "http://example.com"];
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

// IMPORT ROUTES
import userRouter from "./routes/user.route.js";
import channelRouter from "./routes/channel.route.js";
import watchRouter from "./routes/watch.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import recommendRouter from "./routes/recommend.route.js";

// DECLARE ROUTES
app.use("/api/v1/user", userRouter);
app.use("/api/v1/channel", channelRouter);
app.use("/api/v1/watch", watchRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/recommend", recommendRouter);

// Error-handling middleware: Catches and formats custom ApiError instances or generic errors to json.
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
app.use(errorHandler);

export default app;
