import rateLimit from "express-rate-limit";

const limiterDefaults = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
};

// General limiter for the whole API
export const apiLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { success: false, message: "Too many requests, try again later." },
});

// Strict limiter for login / register / password reset
export const authLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // only failed attempts count
  message: {
    success: false,
    message: "Too many attempts, please try again in 15 minutes.",
  },
});
