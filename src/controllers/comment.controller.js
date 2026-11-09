import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Comment from "../models/comment.model.js";
import Video from "../models/video.model.js";
import CommunityPost from "../models/communityPost.model.js";
import { resolveRefOrCursorId } from "../utils/helper.js";

// ADD COMMENT
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { refType, refId: rawRefId } = req.params;

  if (!refType || !rawRefId) {
    throw new ApiError(
      400,
      "COMMENT ADD ERROR:: RefType and RefId are required"
    );
  }

  if (!content) {
    throw new ApiError(400, "COMMENT ADD ERROR:: Content is required");
  }

  const refId = resolveRefOrCursorId(rawRefId, "ADD COMMENT ERROR");

  // validate reference type
  const models = { Video, CommunityPost, Comment };
  const Model = models[refType];

  if (!Model) {
    throw new ApiError(404, "COMMENT ADD ERROR:: Invalid refType");
  }

  const exists = await Model.exists({ _id: refId });
  if (!exists) {
    throw new ApiError(404, `COMMENT ADD ERROR:: Invalid ${refType} refId`);
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
  const { id: rawId } = req.params;
  const id = resolveRefOrCursorId(rawId, "UPDATE COMMENT ERROR");

  if (!id) {
    throw new ApiError(400, "COMMENT UPDATE ERROR:: Comment id is required");
  }
  if (!content) {
    throw new ApiError(400, "COMMENT UPDATE ERROR:: Content is required");
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
  const { id: rawId } = req.params;
  const id = resolveRefOrCursorId(rawId, "DELETE COMMENT ERROR");

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
  const { refId: rawRefId } = req.params;
  const refId = resolveRefOrCursorId(rawRefId, "GET COMMENTS BY REF_ID ERROR");

  if (!refId) {
    throw new ApiError(400, "GET ALL COMMENTS ERROR:: RefId is required");
  }

  const comments = await Comment.aggregate([
    {
      $match: {
        refId: new mongoose.Types.ObjectId(String(refId)),
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
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "All comments fetched successfully"));
});

export { addComment, updateComment, deleteComment, getAllCommentsByRefId };
