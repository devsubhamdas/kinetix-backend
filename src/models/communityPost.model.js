import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const communityPostSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    attachment: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

communityPostSchema.plugin(mongooseAggregatePaginate);

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);

export default CommunityPost;
