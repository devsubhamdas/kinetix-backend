import helmet from "helmet";

/* 1. Security headers (CSP, nosniff, frameguard, HSTS, ...)           */
export const securityHeaders = helmet({
  // allow the frontend (different origin) to load files from /public
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
