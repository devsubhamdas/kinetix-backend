import fs from "fs";

const deleteTempFilesOnError = (localFilePaths) => {
  localFilePaths.forEach((filePath) => filePath && fs.unlinkSync(filePath));
};

const parseTags = (tags) => {
  return tags?.split(",").map((tag) => `#${tag.trim().toLowerCase()}`);
};

// helpers for parse url cursor pagination token
const base64ToUrlSafe = (token) =>
  token.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const urlSafeToBase64 = (token) => {
  let t = token.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "="; // restore padding
  return t;
};

export { deleteTempFilesOnError, parseTags, base64ToUrlSafe, urlSafeToBase64 };
