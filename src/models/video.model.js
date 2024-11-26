import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    genre: {
      type: String,
      enum: [
        "video",
        "tutorials",
        "vlogs",
        "reviews",
        "live streams",
        "short films",
        "documentaries",
        "music videos",
        "interviews",
        "podcasts",
        "gameplay videos",
        "unboxings",
        "event coverage",
        "challenges",
        "reaction videos",
        "skits",
        "parodies",
        "q&a sessions",
        "educational lectures",
        "webinars",
        "time-lapse videos",
        "asmr",
        "diy projects",
        "fitness workouts",
        "travel diaries",
        "animation",
        "behind-the-scenes",
        "motivational speeches",
        "movie/tv show recaps",
        "compilation videos",
        "news reports",
      ],
    },
    tags: [String],
    videoPublicId: {
      type: String,
      required: true,
    },
    thumbnailPublicId: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

const Video = mongoose.model("Video", videoSchema);

export default Video;
