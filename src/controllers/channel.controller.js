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

  const channel = await User.findOne({ username });

  if (!username || !channel) {
    throw new ApiError(400, "CHANNEL ERROR:: User not found");
  }

  const videos = await Video.aggregate([
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
          $first: "$owner"
        },
      }
    },
    {
      $match: {
        "owner.username": channel.username,
      }
    },
    {
      $project: {
        videoFile: 1, 
        thumbnail: 1,
        title: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

// GET COMMUNITY POSTS BY CHANNEL NAME
const getAllPostsByChannelName = asyncHandler(async (req, res) => {});

// GET PLAYLISTS BY CHANNEL NAME
const getAllPlaylistsByChannelName = asyncHandler(async (req, res) => {});

export { getChannelInfoAndStats, getAllVideosByChannelName };
