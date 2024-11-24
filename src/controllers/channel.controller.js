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

// GET CHANNEL INFO AND STATS
const getChannelInfoAndStats = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "CHANNEL ERROR:: Username not found");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.trim().toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        avatarPublicId: 1,
        coverImage: 1,
        coverImagePublicId: 1,
      },
    },
  ]);

  if (channel?.length) {
    throw new ApiError(400, "CHANNEL ERROR:: Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "Channel info and stats fetched successfully"
      )
    );
});

// GET VIDEOS BY CHANNEL NAME
const getAllVideosByChannelName = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (username !== req.user?.username) {
    throw new ApiError(400, "CHANNEL ERROR:: Owner not found");
  }

  const videos = await Video.find({ owner: req.user?._id });

  if(!(videos?.length > 0)) {
    throw new ApiError(404, "CHANNEL ERROR:: You haven't uploaded any video yet")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

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
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Owner not found");
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

// UPDATE VIDEO INFO

export { getChannelInfoAndStats, uploadVideo, getAllVideosByChannelName };
