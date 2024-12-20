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

  const { path: videoFileLocalPath, mimetype: videoFileMimetype } = req.files
    ?.videoFile?.[0] || { path: undefined, mimetype: undefined };

  const { path: videoThumbnailLocalPath, mimetype: videoThumbnailMimetype } =
    req.files?.videoThumbnail?.[0] || { path: undefined, mimetype: undefined };

  if (username !== req.user?.username) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(401, "VIDEO UPLOAD ERROR:: Unauthorised user access");
  }

  if (videoFileMimetype && !videoFileMimetype.startsWith("video/")) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Invalid video file type");
  }

  if (videoThumbnailMimetype && !videoThumbnailMimetype.startsWith("image/")) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Invalid thumbnail file type");
  }

  if (!videoFileLocalPath) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Video file required");
  }

  if (!videoTitle?.trim()) {
    deleteTempFilesOnError([videoFileLocalPath, videoThumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPLOAD ERROR:: Video title required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const videoThumbnail = videoThumbnailLocalPath
    ? await uploadOnCloudinary(videoThumbnailLocalPath)
    : undefined;

  if (!videoFile) {
    throw new ApiError(
      500,
      "VIDEO UPLOAD ERROR: Something went while uploading video to cloudinary"
    );
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: videoThumbnail?.url || null,
    owner: req.user?._id,
    title: videoTitle,
    description: videoDesc?.trim() || null,
    genre: videoGenre?.toLowerCase() || "video",
    tags: videoTags?.trim() ? parseTags(videoTags) : [],
    videoPublicId: videoFile.public_id,
    thumbnailPublicId: videoThumbnail?.public_id || null,
    duration: videoFile.duration,
  });

  if (!video) {
    if (videoFile) await deleteFromCloudinary(videoFile.public_id, "video");
    if (videoThumbnail) await deleteFromCloudinary(videoThumbnail.public_id);
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
const updateVideoThumbnail = asyncHandler(async (req, res) => {
  // check if new thumbnail is given
  const { path: thumbnailLocalPath, mimetype: thumbnailMimetype } =
    req.file || { path: undefined, mimetype: undefined };

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "VIDEO UPDATE ERROR:: Thumbnail is required");
  }

  if (thumbnailMimetype && !thumbnailMimetype.startsWith("image/")) {
    deleteTempFilesOnError([thumbnailLocalPath]);
    throw new ApiError(400, "VIDEO UPDATE ERROR:: Invalid thumbnail file type");
  }

  // check unauthorized access
  const { username, id } = req.params;
  if (username !== req.user.username) {
    deleteTempFilesOnError([thumbnailLocalPath]);
    throw new ApiError(401, "VIDEO UPDATE ERROR:: Unauthorised user access");
  }

  // check if video id is valid
  const video = await Video.findById({ _id: id });
  if (!video) {
    deleteTempFilesOnError([thumbnailLocalPath]);
    throw new ApiError(404, "VIDEO UPDATE ERROR:: Invalid video id");
  }

  // check if thumbnail is uploaded successfully on cloudinary or not
  const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!newThumbnail) {
    throw new ApiError(
      500,
      "VIDEO UPDATE ERROR:: Something went wrong while uploading thumbnail on cloudinary"
    );
  }

  // update thumbnail on mongodb
  const newVideo = await Video.findByIdAndUpdate(
    id,
    { thumbnail: newThumbnail.url, thumbnailPublicId: newThumbnail.public_id },
    { new: true }
  );

  // check if thumbnail is update successfully or not
  if (!newVideo) {
    throw new ApiError(
      500,
      "VIDEO UPDATE ERROR:: Something went wrong while saving thumbnail on mongodb"
    );
  }

  // if new thumbnail uploaded and updated successfully then delete old thumbnail from cloudinary
  const { thumbnailPublicId: oldThumbnailPublicId } = video;
  const delResponse = oldThumbnailPublicId
    ? await deleteFromCloudinary(oldThumbnailPublicId)
    : undefined;
  if (oldThumbnailPublicId && !delResponse) {
    throw new ApiError(
      500,
      "VIDEO UPDATE ERROR:: Could not delete old thumbnail"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, newVideo, "Video thumbnail updated successfully")
    );
});

// GET VIDEOS BY CHANNEL NAME
const getAllVideosByChannelName = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const channel = await User.findOne({ username });

  if (!username || !channel) {
    throw new ApiError(400, "CHANNEL ERROR:: Channel not found");
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
        thumbnail: 1,
        title: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

// GET VIDEO BY ID
const getVideoById = asyncHandler(async (req, res) => {
  const { username, id } = req.params;

  if (!username || !id) {
    throw new ApiError(400, "GET VIDEO ERROR:: Username and id required");
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
    throw new ApiError(404, "GET VIDEO ERROR:: Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// GET VIDEO BY RECOMMENDATION
const getVideosByRecommendation = asyncHandler(async (_, res) => {
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
          $first: "$owner",
        },
      },
    },{
      $project: {
        thumbnail: 1,
        title: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        "owner.username": 1,
        "owner.avatar": 1,
      }
    }
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, videos, "Recommended videos fetched successfully")
    );
});

// TOGGLE VIDEO STATUS
const toggleVideoStatus = asyncHandler(async (req, res) => {});

export {
  uploadVideo,
  deleteVideo,
  updateVideoDetails,
  updateVideoThumbnail,
  getAllVideosByChannelName,
  getVideoById,
  getVideosByRecommendation,
};
