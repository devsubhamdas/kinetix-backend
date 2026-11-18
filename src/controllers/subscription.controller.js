import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";

// Shared helper: validates the param and returns the channel's _id
const getChannelId = async (channelName, context) => {
  const name = channelName?.trim().toLowerCase();
  if (!name) {
    throw new ApiError(400, `${context} ERROR:: Channel name required`);
  }

  const channel = await User.findOne({ username: name }).select("_id").lean();
  if (!channel) {
    throw new ApiError(404, `${context} ERROR:: Channel not found`);
  }

  return channel._id;
};

// SUBSCRIBE CHANNEL
const subscribeChannel = asyncHandler(async (req, res) => {
  const channelId = await getChannelId(
    req.params.channelName,
    "SUBSCRIBE CHANNEL"
  );

  try {
    const newSubscription = await Subscription.create({
      channel: channelId,
      subscriber: req.user._id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, newSubscription, "Channel subscribed successfully")
      );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "SUBSCRIBE CHANNEL ERROR:: You have already subscribed to this channel"
      );
    }
    throw error;
  }
});

// UNSUBSCRIBE CHANNEL
const unsubscribeChannel = asyncHandler(async (req, res) => {
  const channelId = await getChannelId(
    req.params.channelName,
    "UNSUBSCRIBE CHANNEL"
  );

  const deleted = await Subscription.findOneAndDelete({
    channel: channelId,
    subscriber: req.user._id,
  });

  if (!deleted) {
    throw new ApiError(
      400,
      "UNSUBSCRIBE CHANNEL ERROR:: You have not subscribed to this channel"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Channel unsubscribed successfully"));
});

export { subscribeChannel, unsubscribeChannel };
