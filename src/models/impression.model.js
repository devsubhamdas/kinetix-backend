import mongoose, { Schema } from "mongoose";

const impressionSchema = new Schema(
  {
    impression: {
      type: Boolean,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    refType: {
      type: String,
      enum: ["Video", "CommunityPost", "Comment"],
      required: true,
    },
    refId: {
      type: Schema.Types.ObjectId,
      refPath: "refType",
      required: true,
    },
  },
  { timestamps: true }
);

const Impression = mongoose.model("Impression", impressionSchema);

export default Impression;
