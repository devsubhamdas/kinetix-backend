import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    communityPost: {
      type: Schema.Types.ObjectId,
      ref: "CommunityPost",
    },
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
