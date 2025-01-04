import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";

// SUBSCRIBE CHANNEL
const subscribeChannel = asyncHandler(async (req, res) => {
  const { channelName } = req.params;
  if (!channelName) {
    throw new ApiError(400, "SUBSCRIBE CHANNEL ERROR:: Channel name required");
  }

  const channel = await User.findOne({ username: channelName });
  if (!channel) {
    throw new ApiError(400, "SUBSCRIBE CHANNEL ERROR:: Channel name not found");
  }

  const subscriptionAlreadyExists = await Subscription.findOne({
    channel: channel._id,
    subscriber: req.user._id,
  });
  if (subscriptionAlreadyExists) {
    throw new ApiError(
      400,
      "SUBSCRIBE CHANNEL ERROR:: You have already subscribed to this channel"
    );
  }

  const newSubscription = await Subscription.create({
    channel: channel._id,
    subscriber: req.user._id,
  });

  if (!newSubscription) {
    throw new ApiError(
      500,
      "SUBSCRIBE CHANNEL ERROR:: Something went wrong while saving new subscription in database"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, newSubscription, "Channel subscribed successfully")
    );
});

// UNSUBSCRIBE CHANNEL
const unsubscribeChannel = asyncHandler(async (req, res) => {
  const { channelName } = req.params;
  if (!channelName) {
    throw new ApiError(
      400,
      "UNSUBSCRIBE CHANNEL ERROR:: Channel name required"
    );
  }

  const channel = await User.findOne({ username: channelName });
  if (!channel) {
    throw new ApiError(
      400,
      "UNSUBSCRIBE CHANNEL ERROR:: Channel name not found"
    );
  }

  const subscription = await Subscription.findOne({
    channel: channel._id,
    subscriber: req.user._id,
  });
  if (!subscription) {
    throw new ApiError(
      400,
      "UNSUBSCRIBE CHANNEL ERROR:: You have not subscribed to this channel"
    );
  }

  const isSubscriptionDeleted = await Subscription.findByIdAndDelete(
    subscription._id
  );
  if (!isSubscriptionDeleted) {
    throw new ApiError(
      500,
      "UNSUBSCRIBE CHANNEL ERROR:: Something went wrong while deleting subscription from database"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Channel unsubscribed successfully"));
});

export { subscribeChannel, unsubscribeChannel };
