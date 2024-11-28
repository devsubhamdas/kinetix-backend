import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  getChannelInfoAndStats,
  getAllVideosByChannelName
} from "../controllers/channel.controller.js";
import {
  uploadVideo,
  deleteVideo,
  updateVideoDetails,
  updateVideoThumbnail
} from "../controllers/video.controller.js";

const router = Router();

// get channel info and stats
router.route("/:username").get(getChannelInfoAndStats);

// upload a video
router.route("/:username/video/upload").post(
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

// delete a video
router.route("/:username/video/delete/id/:id").post(verifyJWT, deleteVideo);

// update video details
router.route("/:username/video/update/details/id/:id").put(verifyJWT, updateVideoDetails);

// update video thumbnail
router.route("/:username/video/update/thumbnail/id/:id").put(verifyJWT, upload.single("thumbnail"), updateVideoThumbnail);

// create a post
router.route("/:username/create/post").post(verifyJWT);

// delete a post

// update a post

// create playlist

// update playlist

// delete playlist

// get all videos by channel
router.route("/:username/videos").get(getAllVideosByChannelName);

// get all community post by channel
router.route("/:username/community-post").get();

// get all playlists by channel
router.route("/:username/playlist").get();

export default router;
