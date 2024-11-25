import mongoose, { Schema } from "mongoose";

const dislikeSchema = new Schema(
  {
    dislikedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    communityPost: {
      type: Schema.Types.ObjectId,
      ref: "CommunityPost",
    },
  },
  { timestamps: true }
);

const dislike = mongoose.model("Like", dislikeSchema);

export default dislike;
