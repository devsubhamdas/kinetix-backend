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
import { deleteTempFilesOnError, parseTags } from "../utils/helper.js";

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
  const { username, email, password, fullName, contentGenre, tags } = req.body;

  const { path: avatarLocalPath, mimetype: avatarMimetype } = req.files
    ?.avatar?.[0] || { path: undefined, mimetype: undefined };

  const { path: coverImageLocalPath, mimetype: coverImageMimetype } = req.files
    ?.coverImage?.[0] || { path: undefined, mimetype: undefined };

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

  // validate file type
  if (!avatarMimetype?.startsWith("image/")) {
    deleteTempFilesOnError([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(400, "REGISTRATION ERROR:: Invalid avatar file type");
  }

  if (coverImageMimetype && !coverImageMimetype.startsWith("image/")) {
    deleteTempFilesOnError([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(
      400,
      "REGISTRATION ERROR:: Invalid cover image file type"
    );
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
    coverImage: coverImage?.url || null,
    coverImagePublicId: coverImage?.public_id || null,
    contentGenre: contentGenre?.toLowerCase() || null,
    tags: tags?.trim() ? parseTags(tags) : [],
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

  const { credential, password } = req.body;

  // validate empty field
  if (!credential) {
    throw new ApiError(400, "LOGIN ERROR:: Username or Email required");
  }
  if (!password) {
    throw new ApiError(400, "LOGIN ERROR:: Password required");
  }

  // find user with incoming form data
  const user = await User.findOne({
    $or: [{ username: credential }, { email: credential }],
  });

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

  // get updated loggedin user who now have refresh token from database
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // get token expiary
  const { iat: accessTokenIat, exp: accessTokenExp } = jwt.decode(accessToken);
  const { iat: refreshTokenIat, exp: refreshTokenExp } =
    jwt.decode(refreshToken);

  // convert from seconds to milliseconds
  const accessTokenExpiaryInMilliseconds =
    (accessTokenExp - accessTokenIat) * 1000;
  const refreshTokenExpiaryInMilliseconds =
    (refreshTokenExp - refreshTokenIat) * 1000;

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: accessTokenExpiaryInMilliseconds,
    })
    .cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: refreshTokenExpiaryInMilliseconds,
    })
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
  const { path: localPath, mimetype: fileMimetype } = req.file || {
    path: undefined,
    mimetype: undefined,
  };
  const { avatarPublicId: oldAvatarPublicId } = await User.findById(
    req.user?._id
  ).select("avatarPublicId");

  if (!localPath) {
    throw new ApiError(400, "UPDATE ERROR:: Image file required");
  }

  if (!fileMimetype?.startsWith("image/")) {
    deleteTempFilesOnError([localPath]);
    throw new ApiError(400, "UPDATE ERROR:: Invalid image file type");
  }

  const newAvatar = await uploadOnCloudinary(localPath);

  if (!newAvatar) {
    throw new ApiError(
      400,
      "UPDATE ERROR:: Something went wrong while uploading avatar image"
    );
  }

  // delete old avatar image from cloudinary
  if (oldAvatarPublicId && newAvatar) {
    await deleteFromCloudinary(oldAvatarPublicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: newAvatar.url, avatarPublicId: newAvatar.public_id } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

// UPDATE USER COVER-IMAGE - require multer upload and verifyJWT middlewares
const updateCoverImage = asyncHandler(async (req, res) => {
  const { path: localPath, mimetype: fileMimetype } = req.file || {
    path: undefined,
    mimetype: undefined,
  };

  const { coverImagePublicId: oldCoverImagePublicId } = await User.findById(
    req.user?._id
  ).select("coverImagePublicId");

  if (!localPath) {
    throw new ApiError(400, "UPDATE ERROR:: Image file required");
  }

  if (!fileMimetype?.startsWith("image/")) {
    deleteTempFilesOnError([localPath]);
    throw new ApiError(400, "UPDATE ERROR:: Invalid image file type");
  }

  const newCoverImage = await uploadOnCloudinary(localPath);

  if (!newCoverImage) {
    throw new ApiError(
      400,
      "UPDATE ERROR:: Something went wrong while uploading cover image"
    );
  }

  // delete old cover-image from cloudinary if available
  if (oldCoverImagePublicId && newCoverImage) {
    await deleteFromCloudinary(oldCoverImagePublicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: newCoverImage.url,
        coverImagePublicId: newCoverImage.public_id,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getChannelInfoAndStats = asyncHandler(async (req, res) => {
  const { username } = req.params;
  console.log("sub ", req.body.subscriber);

  if (!username?.trim()) {
    throw new ApiError(400, "CHANNEL ERROR:: Username is required");
  }

  const [channel] = await User.aggregate([
    {
      $match: {
        username: username?.trim().toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [{$toObjectId: req.body.subscriber}, "$subscribers.subscriber"]
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        avatarPublicId: 1,
        coverImage: 1,
        coverImagePublicId: 1,
      },
    },
  ]);

  if (!channel) {
    throw new ApiError(400, "CHANNEL ERROR:: Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel,
        "Channel info and stats fetched successfully"
      )
    );
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
const setWatchHistory = asyncHandler(async (req, res) => {});

// GET SUBSCRIPTION LIST - require verifyJWT middleware
const getSubscriptionList = asyncHandler(async (req, res) => {});

// SET SUBSCRIPTION LIST - require verifyJWT middleware
const setSubscriptionList = asyncHandler(async (req, res) => {});

// RE-ESTABLISH SESSION ACCESS TOKEN IF REFRESH TOKEN AVAILABLE
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get incoming token
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // console.log("refreshToken ", incomingRefreshToken);

  // validate incoming token
  if (!incomingRefreshToken) {
    throw new ApiError(
      401,
      "REFRESH TOKEN ERROR:: Unauthorized request: Token missing"
    );
  }

  try {
    // decode incoming token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // find user in database with the given token
    const user = await User.findById(decodedToken?._id);

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
    throw new ApiError(401, `REFRESH ACCESS TOKEN ERROR:: ${error?.message}`);
  }
});

// VALIDATE ACCESS TOKEN
const validateAccessToken = asyncHandler(async (req, res) => {
  const incomingAccessToken =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  // console.log("accessToken ", token);

  //verify token
  if (!incomingAccessToken) {
    throw new ApiError(401, "Unauthorized request: Token missing");
  }

  try {
    // decode token
    const decodedToken = jwt.verify(incomingAccessToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    return res.status(200).json(new ApiResponse(200, "Access token is valid"));
  } catch (error) {
    throw new ApiError(401, `VALIDATE ACCESS TOKEN ERROR:: ${error?.message}`);
  }
});

// DELETE ACCOUNT
const deleteAccount = asyncHandler(async (req, res) => {});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updatePassword,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getChannelInfoAndStats,
  getWatchHistory,
  refreshAccessToken,
  validateAccessToken,
};
