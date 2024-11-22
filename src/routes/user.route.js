import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updatePassword,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  refreshAccessSession,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
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

// get current user
router.route("/current-user").get(verifyJWT, getUser);

// user update password
router.route("/update/password").put(verifyJWT, updatePassword);

// user update account details
router.route("/update/account-details").put(verifyJWT, updateAccountDetails);

// user update avatar image
router.route("/update/avatar-image").put(verifyJWT, upload.single("avatar"), updateAvatar);

// user update cover image
router.route("/update/cover-image").put(verifyJWT, upload.single("coverImage"), updateCoverImage);

// re-established session
router.route("/renew/access-token").post(refreshAccessSession);

export default router;
