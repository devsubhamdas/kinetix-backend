import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Comment from "../models/comment.model.js";
import Video from "../models/video.model.js";
import CommunityPost from "../models/CommunityPost.model.js";

// ADD COMMENT
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { refType, refId } = req.params;
  if (!content) {
    throw new ApiError(400, "COMMENT ADD ERROR:: Content is required");
  }

  if (!refType || !refId) {
    throw new ApiError(
      400,
      "COMMENT ADD ERROR:: RefType and RefId are required"
    );
  }

  // validate reference type
  const refTypes = ["Video", "CommunityPost", "Comment"];
  if(!refTypes.includes(refType)) {
    throw new ApiError(404, "COMMENT ADD ERROR:: Invalid refType");
  }

  // validate reference id
  if(refTypes === "Video"){
    const video = await Video.findById(refId);
    if(!video) {
      throw new ApiError(404, "COMMENT ADD ERROR:: Invalid video refId");
    }
  }

  if(refTypes === "CommunityPost"){
    const communityPost = await CommunityPost.findById(refId);
    if(!communityPost) {
      throw new ApiError(404, "COMMENT ADD ERROR:: Invalid community-post refId");
    }
  }

  if(refTypes === "Comment"){
    const comment = await Comment.findById(refId);
    if(!comment) {
      throw new ApiError(404, "COMMENT ADD ERROR:: Invalid comment refId");
    }
  }

  // create comment
  const newComment = await Comment.create({
    content,
    owner: req.user?._id,
    refType,
    refId,
  });

  if (!newComment) {
    throw new ApiError(
      400,
      "COMMENT ADD ERROR:: Something went wrong while saving new comment in mongodb"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment added successfully"));
});

// UPDATE COMMENT
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { id } = req.params;

  if (!content) {
    throw new ApiError(400, "COMMENT UPDATE ERROR:: Content is required");
  }

  if (!id) {
    throw new ApiError(400, "COMMENT UPDATE ERROR:: Comment id is required");
  }

  const [user] = await Comment.aggregate([
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
      // this stage is required, unless $eq won't work in the next stage
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $addFields: {
        hasAuthority: {
          $cond: {
            if: {
              $eq: ["$owner._id", req.user._id],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        hasAuthority: 1,
      },
    },
  ]);

  if (!user) {
    throw new ApiError(404, "COMMENT UPDATE ERROR:: Invalid comment id");
  }

  if (!user.hasAuthority) {
    throw new ApiError(400, "COMMENT UPDATE ERROR:: Unauthorised user access");
  }

  const newComment = await Comment.findByIdAndUpdate(
    id,
    {
      $set: { content },
    },
    { new: true }
  );

  if (!newComment) {
    throw new ApiError(
      404,
      "COMMENT UPDATE ERROR:: Something went wrong while updating to mongodb"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment updated successfully"));
});

// DELETE COMMENT
const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(400, "COMMENT DELETE ERROR:: Comment Id is required");
  }

  const [user] = await Comment.aggregate([
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
      // this stage is required, unless $eq won't work in the next stage
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $addFields: {
        hasAuthority: {
          $cond: {
            if: {
              $eq: ["$owner._id", req.user._id],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        hasAuthority: 1,
      },
    },
  ]);

  if (!user) {
    throw new ApiError(404, "COMMENT UPDATE ERROR:: Invalid comment id");
  }

  if (!user.hasAuthority) {
    throw new ApiError(400, "COMMENT UPDATE ERROR:: Unauthorised user access");
  }

  const isDeleted = await Comment.findByIdAndDelete(id);

  if (!isDeleted) {
    throw new ApiError(
      400,
      "COMMENT DELETE ERROR:: Something went wrong while deleting comment from mongodb"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

// GET ALL COMMENTS
const getAllCommentsByRefId = asyncHandler(async (req, res) => {
  const { refId } = req.params;
  if (!refId) {
    throw new ApiError(400, "GET ALL COMMENTS ERROR:: RefId is required");
  }

  const comments = await Comment.find({ refId });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "All comments fetched successfully"));
});

export { addComment, updateComment, deleteComment, getAllCommentsByRefId };
