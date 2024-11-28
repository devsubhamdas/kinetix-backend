import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import { parseTags } from "../utils/helper.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { deleteTempFilesOnError } from "../utils/helper.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from "../constants.js";

// UPLOAD VIDEO
const uploadVideo = asyncHandler(async (req, res) => {
  /* 
    # steps: 
    - verify login
    - get username and video file
    - validate video title, thumbnail, owner and path
    - create new video object
    - upload to cloudinary
  */

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
    throw new ApiError(401, "VIDEO UPLOAD ERROR:: Unauthorised user access");
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
    throw new ApiError(500, "VIDEO UPLOAD ERROR: Something went while uploading video to cloudinary");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: videoThumbnail?.url || "",
    owner: req.user?._id,
    title: videoTitle,
    description: videoDesc?.trim() || "",
    genre: videoGenre?.toLowerCase() || "video",
    tags: videoTags?.trim() ? parseTags(videoTags) : [],
    videoPublicId: videoFile.public_id,
    thumbnailPublicId: videoThumbnail?.public_id || "",
    duration: videoFile.duration,
  });

  if (!video) {
    if(videoFile) deleteFromCloudinary(videoFile.public_id, "video");
    if(videoThumbnail) deleteFromCloudinary(videoThumbnail.public_id);
    throw new ApiError(
      500,
      "VIDEO UPLOAD ERROR:: Something went wrong while saving video to mongodb"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"));
});

// DELETE VIDEO
const deleteVideo = asyncHandler(async (req, res) => {
  /* 
    # steps:
    - validate username and video id
    - validate channel
    - validate if the video belongs to that owner
    - select the video
    - validate if thumbnail to be deleted or not
    - delete video and/or thumbnail from cloudinary
    - if successfully deleted from cloudinary, then delete from database
    - return response
  */
  const { username, id } = req.params;

  if (username !== req.user.username) {
    throw new ApiError(401, "VIDEO DELETE ERROR:: Unauthorised user access");
  }

  if (!username || !id) {
    throw new ApiError(
      400,
      "VIDEO DELETE ERROR:: Username and Video Id required"
    );
  }

  const channel = await User.findOne({ username });

  if (!channel) {
    throw new ApiError(400, "VIDEO DELETE ERROR:: Unknown username");
  }

  const [video] = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(String(id)),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $match: {
        "owner.username": channel.username,
      },
    },
    {
      $project: {
        videoPublicId: 1,
        thumbnailPublicId: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(400, "VIDEO DELETE ERROR:: Invalid video id");
  }

  const { videoPublicId, thumbnailPublicId } = video;

  const videoDelResponse = await deleteFromCloudinary(videoPublicId, "video");
  const thumbnailDelResponse = video?.thumbnailPublicId
    ? await deleteFromCloudinary(thumbnailPublicId)
    : undefined;

  if (
    videoDelResponse?.error ||
    (thumbnailPublicId && thumbnailDelResponse?.error)
  ) {
    throw new ApiError(
      400,
      "VIDEO DELETE ERROR:: Something went wrong while deleting video from cloudinary"
    );
  }

  const isDeleted = await Video.findByIdAndDelete({ _id: id });

  if (!isDeleted) {
    // code to restore the deleted file from cloudinary
    throw new ApiError(
      400,
      "VIDEO DELETE ERROR:: Something went wrong while deleting video from mongodb"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// UPDATE VIDEO DETAILS
const updateVideoDetails = asyncHandler(async (req, res) => {
  const { username, id } = req.params;

  if (username !== req.user.username) {
    throw new ApiError(401, "VIDEO UPDATE ERROR:: Unauthorised user access");
  }

  const video = await Video.findById({ _id: id });

  if (!video) {
    throw new ApiError(404, "VIDEO UPDATE ERROR:: Invalid video id");
  }

  const { title, description, genre, tags } = req.body;

  if (!title) {
    throw new ApiError(400, "VIDEO UPDATE ERROR:: Title cannot be empty");
  }

  if (title) {
    const response = await Video.findByIdAndUpdate(id, { $set: { title } });
    if (!response) {
      throw new ApiError(500, "VIDEO UPDATE ERROR:: Cannot update title");
    }
  }

  if (description) {
    const response = await Video.findByIdAndUpdate(id, {
      $set: { description },
    });
    if (!response) {
      throw new ApiError(500, "VIDEO UPDATE ERROR:: Cannot update description");
    }
  }

  if (genre) {
    const response = await Video.findByIdAndUpdate(id, { $set: { genre } });
    if (!response) {
      throw new ApiError(500, "VIDEO UPDATE ERROR:: Cannot update genre");
    }
  }

  if (tags) {
    const response = await Video.findByIdAndUpdate(id, {
      $set: { tags: parseTags(tags) },
    });
    if (!response) {
      throw new ApiError(500, "VIDEO UPDATE ERROR:: Cannot update tags");
    }
  }

  const newVideo = await Video.findById({ _id: id });

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video details updated successfully"));
});

// UPDATE VIDEO THUMBNAIL

// GET VIDEO BY ID
const getVideoById = asyncHandler(async (req, res) => {
  const { username, id } = req.params;

  if (!username || !id) {
    throw new ApiError(400, "GET VIDEO ERROR:: Username and v_id required");
  }

  const [video] = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(String(id)),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $match: {
        "owner.username": username,
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(400, "GET VIDEO ERROR:: Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// GET VIDEO BY RECOMMENDATION
const getVideosByRecommendation = asyncHandler(async (req, res) => {});

// TOGGLE VIDEO STATUS
const toggleVideoStatus = asyncHandler(async (req, res) => {});

// CREATE POST
const createPost = asyncHandler(async (req, res) => {});

// DELETE POST
const deletePost = asyncHandler(async (req, res) => {});

// UPDATE POST
const updatePost = asyncHandler(async (req, res) => {});

// GET ALL POST
const getAllPosts = asyncHandler(async (req, res) => {});

// CREATE PLAYLIST
const createPlaylist = asyncHandler(async (req, res) => {});

// DELETE PLAYLIST
const deletePlaylist = asyncHandler(async (req, res) => {});

// UPDATE PLAYLIST
const updatePlaylist = asyncHandler(async (req, res) => {});

// GET ALL PLAYLISTS
const getAllPlaylists = asyncHandler(async (req, res) => {});

export { uploadVideo, deleteVideo, getVideoById, updateVideoDetails };
