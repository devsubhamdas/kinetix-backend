export const DB_NAME = "dev_db_kinetix";

export const COOKIE_OPTIONS = {
  httpOnly: true, // modifiable only from server
  sameSite: "none",
  secure: true,
  // secure: process.env.NODE_ENV === "production",
};
