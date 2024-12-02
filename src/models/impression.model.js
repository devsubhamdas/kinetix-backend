import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    impression: {
      type: Boolean,
      required: true,
    },
    madeBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    impressionRefType: {
      type: String,
      enum: ["Video", "CommunityPost", "Comment"],
      required: true,
    },
    impressionMadeTo: {
      type: Schema.Types.ObjectId,
      refPath: "impressionRefType",
      required: true,
    },
  },
  { timestamps: true }
);

const Like = mongoose.model("Like", likeSchema);

export default Like;
