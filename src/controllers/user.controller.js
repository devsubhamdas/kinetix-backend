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

export { registerUser };
