import { doubleCsrf } from "csrf-csrf";

const isProd = process.env.NODE_ENV === "production";

/* CSRF (double-submit cookie, csrf-csrf v4) */
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  // No server session here; bind to a session/user id if you want stricter checks
  getSessionIdentifier: () => "",
  cookieName: isProd ? "__Host-csrf" : "csrf",
  cookieOptions: {
    httpOnly: true,
    secure: isProd,
    // "none" is needed if frontend and API are on different sites;
    // use "lax"/"strict" if they share the same site
    sameSite: isProd ? "none" : "lax",
    path: "/",
  },
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

export const csrfProtection = doubleCsrfProtection;

// GET /api/v1/csrf-token -> { csrfToken }
export const csrfTokenHandler = (req, res) =>
  res.json({ csrfToken: generateCsrfToken(req, res) });
