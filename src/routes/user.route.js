import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessSession } from "../controllers/user.controller.js";
import { verifyJWT }from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// user register
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

// user login
router.route("/login").post(loginUser);

// user logout
router.route("/logout").post(verifyJWT, logoutUser);

// re-established session
router.route("/refresh-token").post(refreshAccessSession);

export default router;
