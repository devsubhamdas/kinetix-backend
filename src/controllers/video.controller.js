import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { deleteTempFilesOnError } from "../utils/helper.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from "../constants.js";

// HELPER FUNCTIONS
const parseTags = (tags) => {
  return tags?.split(",");
};

// UPLOAD VIDEO
const uploadVideo = asyncHandler(async (req, res) => {
  // verify login
  // get username and video file
  // validate video title, thumbnail, owner and path
  // create new video object
  // upload to cloudinary

  const { username } = req.params;
  const { videoTitle, videoDesc, videoGenre, videoTags } = req.body;

  const videoFileLocalPath =
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
      ? req.files.videoFile[0].path
      : undefined;

  const videoThumbnailLocalPath =
    req.files &&
    Array.isArray(req.files.videoThumbnail) &&
    req.files.videoThumbnail.length > 0
      ? req.files.videoThumbnail[0].path
      : undefined;

  if (username !== req.user?.username) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Unknown username");
  }

  if (!videoFileLocalPath) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Video file required");
  }

  if (!videoTitle.trim()) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Video title required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const videoThumbnail = await uploadOnCloudinary(videoThumbnailLocalPath);

  if (!videoFile) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR: Video file required");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: videoThumbnail?.url || "",
    owner: req.user?._id,
    title: videoTitle,
    description: videoDesc?.trim() || "",
    genre: videoGenre || "Video",
    tags: videoTags?.trim() ? parseTags(videoTags) : [],
    videoPublicId: videoFile.public_id,
    thumbnailPublicId: videoThumbnail?.public_id || "",
    duration: videoFile.duration,
  });

  if (!video) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(
      500,
      "VIDEO UPLOAD ERROR:: Something went wrong while uploading video"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"));
});

// DELETE VIDEO
const deleteVideo = asyncHandler(async (req, res) => {

});

// GET VIDEO BY ID
const getVideoById = asyncHandler(async (req, res) => {

});

// GET VIDEO BY ID
const getVideosByRecommendation = asyncHandler(async (req, res) => {

});

// TOGGLE VIDEO STATUS
const toggleVideoStatus = asyncHandler(async (req, res) => {

});

// UPDATE VIDEO INFO
const updateVideoDetails = asyncHandler(async (req, res) => {

});

// CREATE POST
const createPost = asyncHandler(async (req, res) => {

});

// DELETE POST
const deletePost = asyncHandler(async (req, res) => {

});

// UPDATE POST
const updatePost = asyncHandler(async (req, res) => {

});

// GET ALL POST
const getAllPosts = asyncHandler(async (req, res) => {

});

// CREATE PLAYLIST
const createPlaylist = asyncHandler(async (req, res) => {

});

// DELETE PLAYLIST
const deletePlaylist = asyncHandler(async (req, res) => {

});

// UPDATE PLAYLIST
const updatePlaylist = asyncHandler(async (req, res) => {

});

// GET ALL PLAYLISTS
const getAllPlaylists = asyncHandler(async (req, res) => {

});

export {
  uploadVideo
}