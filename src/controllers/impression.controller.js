import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Impression from "../models/impression.model.js";

// ADD LIKE
const addLike = asyncHandler(async (req, res) => {
  const { refType, refId } = req.params;
  if (!refType || !refId) {
    throw new ApiError(400, "ADD LIKE ERROR:: refType and refId required");
  }

  const isLikeExists = await Impression.findOne({
    isLiked: true,
    owner: req.user?._id,
    refId: refId,
  });
  if (isLikeExists) {
    throw new ApiError(400, "ADD LIKE ERROR:: Duplicate like impression");
  }

  // if dislike exists, update it to like impression
  const isDislikeExists = await Impression.findOne({
    isLiked: false,
    owner: req.user?._id,
    refId: refId,
  });
  if (isDislikeExists) {
    const updatedImpression = await Impression.findByIdAndUpdate(
      isDislikeExists._id,
      {
        $set: {
          isLiked: true,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedImpression,
          "Like impression added successfully"
        )
      );
  }

  const newImpression = await Impression.create({
    isLiked: true,
    owner: req.user?._id,
    refType: refType,
    refId: refId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, newImpression, "Like impression added successfully")
    );
});

// DELETE LIKE
const deleteLike = asyncHandler(async (req, res) => {
  const { refType, refId } = req.params;
  if (!refType || !refId) {
    throw new ApiError(400, "DELETE LIKE ERROR:: refType and refId required");
  }

  const isLikeExists = await Impression.findOne({
    isLiked: true,
    owner: req.user?._id,
    refId: refId,
  });
  if (!isLikeExists) {
    throw new ApiError(
      400,
      "DELETE LIKE ERROR:: Like impression does not exists"
    );
  }

  const isLikeDeleted = await Impression.findByIdAndDelete(isLikeExists._id);
  if (!isLikeDeleted) {
    throw new ApiError(
      500,
      "DELETE LIKE ERROR:: Something went wrong while deleting like impression from database"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Like deleted successfully"));
});

// ADD DISLIKE
const addDislike = asyncHandler(async (req, res) => {
  const { refType, refId } = req.params;
  if (!refType || !refId) {
    throw new ApiError(400, "ADD DISLIKE ERROR:: refType and refId required");
  }

  const isDislikeExists = await Impression.findOne({
    isLiked: false,
    owner: req.user?._id,
    refId: refId,
  });
  if (isDislikeExists) {
    throw new ApiError(400, "ADD DISLIKE ERROR:: Duplicate dislike impression");
  }

  // if like exists, update it to dislike impression
  const isLikeExists = await Impression.findOne({
    isLiked: true,
    owner: req.user?._id,
    refId: refId,
  });
  if (isLikeExists) {
    const updatedImpression = await Impression.findByIdAndUpdate(
      isLikeExists._id,
      {
        $set: {
          isLiked: false,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedImpression,
          "Dislike impression added successfully"
        )
      );
  }

  const newImpression = await Impression.create({
    isLiked: false,
    owner: req.user?._id,
    refType: refType,
    refId: refId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newImpression,
        "Dislike impression added successfully"
      )
    );
});

// DELETE DISLIKE
const deleteDislike = asyncHandler(async (req, res) => {
  const { refType, refId } = req.params;
  if (!refType || !refId) {
    throw new ApiError(400, "DELETE DISLIKE ERROR:: refType and refId required");
  }

  const isDislikeExists = await Impression.findOne({
    isLiked: false,
    owner: req.user?._id,
    refId: refId,
  });
  if (!isDislikeExists) {
    throw new ApiError(
      400,
      "DELETE DISLIKE ERROR:: Dislike impression does not exists"
    );
  }

  const isdislikeDeleted = await Impression.findByIdAndDelete(isDislikeExists._id);
  if (!isdislikeDeleted) {
    throw new ApiError(
      500,
      "DELETE DISLIKE ERROR:: Something went wrong while deleting dislike impression from database"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Dislike deleted successfully"));
});

export { addLike, deleteLike, addDislike, deleteDislike };
