import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from "../constants.js";
import { deleteTempFilesOnError } from "../utils/helper.js";

// HELPER FUNCTIONS
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, `TOKEN GENERATE ERROR:: ${error?.message}`);
  }
};

// VALIDATE AND CREATE NEW USER
const registerUser = asyncHandler(async (req, res) => {
  /* 
    # steps:
    - get user details from frontend
    - validate - for no empty fields
    - validate no images or avatar file
    - check if user alreadty exits - username or email
    - upload to cloudinary - images or avater, cover image
    - create user object - insert into database
    - check if user created successfully or not
    - remove password and refreshToken from response object
    - return response
  */
  
  // get form data and files
  const { username, email, password, fullName } = req.body;

  const avatarLocalPath =
    req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0
      ? req.files.avatar[0].path
      : undefined;

  const coverImageLocalPath =
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
      ? req.files.coverImage[0].path
      : undefined;

  // validate for empty fields
  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    deleteTempFilesOnError([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(400, "REGISTRATION ERROR:: Empty field not allowed");
  }

  // validate for no avatar or image
  if (!avatarLocalPath) {
    deleteTempFilesOnError([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(400, "REGISTRATION ERROR:: Avatar image required");
  }

  // validate if user already exits
  const userExists = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExists) {
    deleteTempFilesOnError([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(409, "REGISTRATION ERROR:: User already exists");
  }

  // upload file to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "REGISTRATION ERROR:: Avatar image required");
  }

  // insert to database
  const user = await User.create({
    username: username?.toLowerCase(),
    email: email?.toLowerCase(),
    password,
    fullName,
    avatar: avatar.url,
    avatarPublicId: avatar.public_id,
    coverImage: coverImage?.url || "",
    coverImagePublicId: coverImage?.public_id || "",
  });

  // check if user successfully created or not, remove password and refreshToken field
  const newUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!newUser) {
    throw new ApiError(
      500,
      "REGISTRATION ERROR:: Something went wrong while registering new user"
    );
  }

  // api response
  return res
    .status(201)
    .json(new ApiResponse(200, newUser, "User registered successfully"));
});

// VALIDATE AND LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  /*
    # steps:
    - get user details from frontend - username or email and password
    - find user using username or email
    - verify password
    - get access and refresh token
    - send cookie
  */
  
  const { username, email, password } = req.body;

  // validate empty field
  if (!(username || email)) {
    throw new ApiError(400, "LOGIN ERROR:: Username or Email required");
  }
  if (!password) {
    throw new ApiError(400, "LOGIN ERROR:: Password required");
  }

  // find user with incoming form data
  const user = await User.findOne({ $or: [{ username }, { email }] });

  // no user found
  if (!user) {
    throw new ApiError(404, "LOGIN ERROR:: User not found");
  }

  // verify password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "LOGIN ERROR:: Invalid password");
  }

  // generate access and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // get loggedin user who have refresh token from database
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send client cookies
  return res
    .status(200)
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
          user: loggedInUser,
        },
        "User logged-in successfully"
      )
    );
});

// LOGOUT USER - require verifyJWT middleware
const logoutUser = asyncHandler(async (req, res) => {
  // delete refresh token from database
  await User.findByIdAndUpdate(req.user?._id, {
    $unset: { refreshToken: 1 },
  });

  // delete client cookies
  return res
    .status(200)
    .clearCookie("accessToken", COOKIE_OPTIONS)
    .clearCookie("refreshToken", COOKIE_OPTIONS)
    .json(new ApiResponse(200, {}, "User logged-out successfully"));
});

// GET CURRENT USER - require verifyJWT middleware
const getUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// UPDATE USER PASSWORD - require verifyJWT middleware
const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "UPDATE ERROR:: Password: No empty fields allowed");
  }

  const user = await User.findById(req.user?._id);
  const isCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isCorrect) {
    throw new ApiError(400, "UPDATE ERROR:: Password: Incorrect password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

// UPDATE USER ACCOUNT - require verifyJWT middleware
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(
      400,
      "UPDATE ERROR:: Account Details: Empty fields not allowed"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account updated successfully"));
});

// UPDATE USER AVATAR - require multer upload and verifyJWT middlewares
const updateAvatar = asyncHandler(async (req, res) => {
  const localPath = req.file ? req.file?.path : undefined;
  const { avatarPublicId } = await User.findById(req.user?._id).select(
    "avatarPublicId"
  );

  if (!localPath) {
    throw new ApiError(400, "UPDATE ERROR:: Image file required");
  }

  const avatar = await uploadOnCloudinary(localPath);

  if (!avatar) {
    deleteTempFilesOnError([localPath]);
    throw new ApiError(
      400,
      "UPDATE ERROR:: Something went wrong while uploading avatar image"
    );
  }

  // delete old avatar image from cloudinary
  if (avatarPublicId && avatar) {
    await deleteFromCloudinary(avatarPublicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url, avatarPublicId: avatar.public_id } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

// UPDATE USER COVER-IMAGE - require multer upload and verifyJWT middlewares
const updateCoverImage = asyncHandler(async (req, res) => {
  const localPath = req.file ? req.file?.path : undefined;
  const { coverImagePublicId } = await User.findById(req.user?._id).select(
    "coverImagePublicId"
  );

  if (!localPath) {
    throw new ApiError(400, "UPDATE ERROR:: Image file required");
  }

  const coverImage = await uploadOnCloudinary(localPath);

  if (!coverImage) {
    deleteTempFilesOnError([localPath]);
    throw new ApiError(
      400,
      "UPDATE ERROR:: Something went wrong while uploading cover image"
    );
  }

  // delete old cover-image from cloudinary if available
  if (coverImagePublicId && coverImage) {
    await deleteFromCloudinary(coverImagePublicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
        coverImagePublicId: coverImage.public_id,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// GET WATCH HISTORY - require verifyJWT middleware
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(String(req.user?._id)),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user) {
    throw new ApiError(404, "WATCH HISTORY ERROR:: User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

// SET WATCH HISTORY - require verifyJWT middleware 
const setWatchHistory = asyncHandler(async (req, res) => {

});

// GET SUBSCRIPTION LIST - require verifyJWT middleware
const getSubscriptionList = asyncHandler(async (req, res) => {

});

// SET SUBSCRIPTION LIST - require verifyJWT middleware
const setSubscriptionList = asyncHandler(async (req, res) => {

});

// RE-ESTABLISH SESSION ACCESS TOKEN IF REFRESH TOKEN AVAILABLE
const refreshAccessSession = asyncHandler(async (req, res) => {
  // get incoming token
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // validate incoming token
  if (!incomingRefreshToken) {
    throw new ApiError(
      401,
      "REFRESH TOKEN ERROR:: Unauthorized request: Token expired"
    );
  }

  try {
    // decode incoming token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // find user in database with the given token
    const user = await User.findById(decodedToken._id);

    // when user not found
    if (!user) {
      throw new ApiError(401, "Invalid token: User not found");
    }

    // when client refresh token mismatch token stored in database
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid token: Tokens didn't match");
    }

    // generate new tokens
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    // send cookies, re-establish new session
    return res
      .status(200)
      .cookie("accessToken", accessToken, COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access tokene refreshed, new session established"
        )
      );
  } catch (error) {
    throw new ApiError(401, `REFRESH TOKEN ERROR:: ${error?.message}`);
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updatePassword,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getWatchHistory,
  refreshAccessSession,
};
