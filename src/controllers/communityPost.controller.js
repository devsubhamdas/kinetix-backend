import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import CommunityPost from "../models/communityPost.model.js";
import User from "../models/user.model.js";
import { deleteTempFilesOnError, parseTags } from "../utils/helper.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

// CREATE POST
const createPost = asyncHandler(async (req, res) => {
  /*
    # steps:
    - verify login
    - verify logged in user and channel
    - validate empty fields
    - validate attachment file type if it is send
    - upload attachment to cloudinary if it is present
    - save new post to database
    - in post not saved to database delete post from cloudinary if uploaded
    - response
  */

  const { content, tags } = req.body;
  const { path: attachmentLocalPath, mimetype: attachmentMimetype } = req.file
    ? req.file
    : { path: undefined, mimetype: undefined };

  if (attachmentLocalPath && !attachmentMimetype.startsWith("image/")) {
    deleteTempFilesOnError([attachmentLocalPath]);
    throw new ApiError(400, "CREATE POST ERROR:: Invalid attachment file type");
  }

  if (!content) {
    if (attachmentLocalPath) deleteTempFilesOnError([attachmentLocalPath]);
    throw new ApiError(400, "CREATE POST ERROR:: Content is required");
  }

  const { username } = req.params;
  if (username !== req.user?.username) {
    if (attachmentLocalPath) deleteTempFilesOnError([attachmentLocalPath]);
    throw new ApiError(401, "CREATE POST ERROR:: Unauthorised user access");
  }

  const attachment = attachmentLocalPath
    ? await uploadOnCloudinary(attachmentLocalPath)
    : undefined;

  if (attachmentLocalPath && !attachment) {
    throw new ApiError(
      500,
      "CREATE POST ERROR:: Something went wrong while uploading attachment in cloudinary"
    );
  }

  const newCommunityPost = await CommunityPost.create({
    owner: req.user?._id,
    content,
    tags: tags?.trim() ? parseTags(tags) : [],
    attachment: attachment?.url || "",
    attachmentPublicId: attachment?.public_id || "",
  });

  if (!newCommunityPost) {
    if (attachment) await deleteFromCloudinary(attachment.public_id);
    throw new ApiError(
      500,
      "CREATE POST ERROR:: Something went wrong while saving post in mongodb"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, newCommunityPost, "New post created successfully")
    );
});

// DELETE POST
const deletePost = asyncHandler(async (req, res) => {
  const { username, id } = req.params;

  if (username !== req.user.username) {
    throw new ApiError(401, "POST DELETE ERROR:: Unauthorised user access");
  }

  if (!username || !id) {
    throw new ApiError(
      400,
      "POST DELETE ERROR:: Username and Post Id required"
    );
  }

  const channel = await User.findOne({ username });

  if (!channel) {
    throw new ApiError(400, "POST DELETE ERROR:: Unknown username");
  }

  const [communityPost] = await CommunityPost.aggregate([
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
        attachmentPublicId: 1,
      },
    },
  ]);

  if (!communityPost) {
    throw new ApiError(400, "POST DELETE ERROR:: Invalid post id");
  }

  const { attachmentPublicId } = communityPost;

  const postDelResponse = attachmentPublicId
    ? await deleteFromCloudinary(attachmentPublicId)
    : undefined;
  if (postDelResponse?.error) {
    throw new ApiError(
      400,
      "POST DELETE ERROR:: Something went wrong while deleting post attachment from cloudinary"
    );
  }

  const isDeleted = await CommunityPost.findByIdAndDelete({ _id: id });

  if (!isDeleted) {
    // code to restore the deleted file from cloudinary
    throw new ApiError(
      400,
      "POST DELETE ERROR:: Something went wrong while deleting community post from mongodb"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});

// UPDATE POST
const updatePost = asyncHandler(async (req, res) => {});

// GET ALL POST
const getPostById = asyncHandler(async (req, res) => {
  const { username, id } = req.params;
  if (!username || !id) {
    throw new ApiError(400, "GET POST ERROR:: Username and id required");
  }

  const [communityPost] = await CommunityPost.aggregate([
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
        content: 1,
        attachment: 1,
        createdAt: 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  if (!communityPost) {
    throw new ApiError(404, "GET POST ERROR:: Community post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, communityPost, "Post fetched successfully"));
});

export { createPost, deletePost, getPostById };
