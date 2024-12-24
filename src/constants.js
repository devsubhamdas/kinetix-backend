export const DB_NAME = "video_streaming_project";

export const COOKIE_OPTIONS = {
  httpOnly: true, // modifiable only from server
  sameSite: "none",
  secure: true,
  // secure: process.env.NODE_ENV === "production",
};
