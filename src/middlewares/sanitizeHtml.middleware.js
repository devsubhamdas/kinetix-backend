import sanitizeHtml from "sanitize-html";

/* HTML sanitization + NoSQL-operator stripping */

// Never sanitize secrets: it would silently alter them
const SKIP_KEYS = new Set([
  "password",
  "oldPassword",
  "newPassword",
  "confirmPassword",
  "cPassword",
  "token",
  "refreshToken",
  "accessToken",
]);

const STRIP_ALL = { allowedTags: [], allowedAttributes: {} };

const cleanString = (str) =>
  sanitizeHtml(str, STRIP_ALL)
    .replace(/&amp;/g, "&") // sanitize-html escapes "&"; restore it ("<" stays escaped)
    .trim();

const clean = (value, depth = 0) => {
  if (depth > 10) return undefined; // guard against deeply nested payloads
  if (typeof value === "string") return cleanString(value);
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      // drop Mongo operators ($ne, $gt...) and dotted keys
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = SKIP_KEYS.has(key) ? val : clean(val, depth + 1);
    }
    return out;
  }
  return value;
};

export const sanitizeInput = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  if (req.query) {
    // defineProperty works on both Express 4 and 5 (req.query is a getter in 5)
    Object.defineProperty(req, "query", {
      value: clean(req.query),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
};
