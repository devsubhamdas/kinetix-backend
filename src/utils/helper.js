import fs from "fs";
import mongoose from "mongoose";
import ApiError from "./ApiError.js";

const deleteTempFilesOnError = (localFilePaths) => {
  localFilePaths.forEach((filePath) => filePath && fs.unlinkSync(filePath));
};

const parseTags = (tags) => {
  return tags?.split(",").map((tag) => `#${tag.trim().toLowerCase()}`);
};

/* helpers for parse url cursor pagination token */
// const base64ToBase64url = (token) =>
//   token.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// const base64urlToBase64 = (token) => {
//   let t = token.replace(/-/g, "+").replace(/_/g, "/");
//   while (t.length % 4) t += "="; // restore padding
//   return t;
// };

const base64ToBase64url = (str) => {
  return Buffer.from(str, "base64").toString("base64url");
};

const base64urlToBase64 = (str) => {
  return Buffer.from(str, "base64url").toString("base64");
};

const base64urlToObjectId = (str) => {
  return Buffer.from(str, "base64url").toString("hex");
};
const objectIdToBase64url = (str) => {
  return Buffer.from(str, "hex").toString("base64url");
};

const resolveRefOrCursorId = (id, errorPrefix = "RESOLVE REF_ID ERROR") => {
  const rawId = String(id ?? "").trim();
  if (!rawId) return null;

  if (mongoose.isObjectIdOrHexString(rawId)) return rawId;

  let decoded;
  try {
    decoded = base64urlToObjectId(rawId);
  } catch {
    throw new ApiError(400, `${errorPrefix}:: id is not valid base64url`);
  }

  if (!mongoose.isObjectIdOrHexString(decoded)) {
    throw new ApiError(400, `${errorPrefix}:: id is not a valid ObjectId`);
  }
  return String(decoded);
};

export {
  deleteTempFilesOnError,
  parseTags,
  base64ToBase64url,
  base64urlToBase64,
  base64urlToObjectId,
  objectIdToBase64url,
  resolveRefOrCursorId,
};
