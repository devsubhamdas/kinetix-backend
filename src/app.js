import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// MIDDLEWARE CONFIGURATION
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// IMPORT ROUTES
import userRouter from "./routes/user.route.js";
import channelRouter from "./routes/channel.route.js";

// DECLARE ROUTES
app.use("/api/v1/user", userRouter);
app.use("/api/v1/channel", channelRouter);

// http://localhost:3000/api/v1/user/register

export default app;