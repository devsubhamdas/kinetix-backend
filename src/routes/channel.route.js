import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  getChannelInfoAndStats,
  uploadVideo,
} from "../controllers/channel.controller.js";

const router = Router();

// get channel info and stats
router.route("/:username").get(verifyJWT, getChannelInfoAndStats);

// upload a video
router.route("/:username/upload/video").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "videoThumbnail",
      maxCount: 1,
    },
  ]),
  uploadVideo
);

// create a post
router.route("/:username/create/post").post(verifyJWT);

// get all videos by channel
router.route("/:username/videos").get(verifyJWT);

// get all playlists
router.route("/:username/playlist").get(verifyJWT);

export default router;
