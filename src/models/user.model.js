import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    avatarPublicId: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    coverImagePublicId: {
      type: String,
    },
    contentGenre: {
      type: String,
      enum: [
        "Adventure",
        "Music",
        "Gaming",
        "Education",
        "Comedy",
        "News",
        "Sports",
        "Technology",
        "Travel",
        "Lifestyle",
        "Fashion",
        "Food & Cooking",
        "Health & Fitness",
        "DIY & Crafts",
        "Animation",
        "Documentary",
        "Movies & Entertainment",
        "Vlogs",
        "Science",
        "History",
        "Motivational & Self-Help",
        "Podcasts & Interviews",
        "Live Streams",
        "Art & Design",
        "Cars & Automotive",
        "Business & Finance",
        "Nature & Wildlife",
        "Kids & Family",
        "Horror & Mystery",
        "Reviews & Unboxings",
        "Tutorials & How-To",
      ],
    },
    tags: [String],
    refreshToken: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

// encrypt password before save to database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// custom methods for verify password, generate access-token and refresh-token
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIARY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIARY,
    }
  );
};

const User = mongoose.model("User", userSchema);

export default User;
