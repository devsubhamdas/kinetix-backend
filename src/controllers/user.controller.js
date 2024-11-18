import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

// HELPER FUNCTIONS
const deleteTempFilesOnFail = (localFilePaths) => {
  localFilePaths.forEach((filePath) => filePath && fs.unlinkSync(filePath));
};

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      `Something went wrong while generating tokens:: ${error?.message}`
    );
  }
};

// VALIDATE AND CREATE NEW USER
const registerUser = asyncHandler(async (req, res) => {
  // steps:
  // # get user details from frontend
  // # validate - for no empty fields
  // # validate no images or avatar file
  // # check if user alreadty exits - username or email
  // # upload to cloudinary - images or avater, cover image
  // # create user object - insert into database
  // # check if user created successfully or not
  // # remove password and refreshToken from response object
  // # return response

  // get form data and files
  const { username, email, password, fullName } = req.body;
  console.log(username, email);

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
    deleteTempFilesOnFail([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(400, "Empty field not allowed");
  }

  // validate for no avatar or image
  if (!avatarLocalPath) {
    deleteTempFilesOnFail([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(400, "Avatar image required");
  }

  // validate if user already exits
  const userExists = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExists) {
    deleteTempFilesOnFail([avatarLocalPath, coverImageLocalPath]);
    throw new ApiError(409, "User already exists");
  }

  // upload file to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar image required");
  }

  // insert to database
  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // check if user successfully created or not, remove password and refreshToken field
  const newUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!newUser) {
    throw new ApiError(500, "Something went wrong while registering new user");
  }

  // api response
  return res
    .status(201)
    .json(new ApiResponse(200, newUser, "User registered successfully"));
});

// VALIDATE AND LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  // steps:
  // get user details from frontend - username or email and password
  // find user using username or email
  // verify password
  // get access and refresh token
  // send cookie

  const { username, email, password } = req.body;

  // validate empty field
  if (!username && !email) {
    throw new ApiError(400, "Username or Email required");
  }
  if (!password) {
    throw new ApiError(400, "Password required");
  }

  // find user
  const user = await User.findOne({ $or: [{ username }, { email }] });

  // no user found
  if (!user) {
    throw new ApiError(404, "No user found");
  }

  // verify password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // generate access and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // loggedin user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookie and response
  const options = {
    httpOnly: true, // modifiable only from server
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        accessToken,
        refreshToken,
        user: loggedInUser,
      })
    );
});

// LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  // delete refresh token from database
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: "" },
  });

  // delete cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
