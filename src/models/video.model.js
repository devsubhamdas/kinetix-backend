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
        "Video",
        "Tutorials",
        "Vlogs",
        "Reviews",
        "Live Streams",
        "Short Films",
        "Documentaries",
        "Music Videos",
        "Interviews",
        "Podcasts",
        "Gameplay Videos",
        "Unboxings",
        "Event Coverage",
        "Challenges",
        "Reaction Videos",
        "Skits",
        "Parodies",
        "Q&A Sessions",
        "Educational Lectures",
        "Webinars",
        "Time-Lapse Videos",
        "ASMR",
        "DIY Projects",
        "Fitness Workouts",
        "Travel Diaries",
        "Animation",
        "Behind-the-Scenes",
        "Motivational Speeches",
        "Movie/TV Show Recaps",
        "Compilation Videos",
        "News Reports",
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
