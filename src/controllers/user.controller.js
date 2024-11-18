import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// validate and create new user
const registerUser = asyncHandler(async (req, res) => {
  // steps:
  // # get user details from frontend
  // # validation - not empty
  // # check if user alreadty exits - username or email
  // # validate images or avatar file
  // # upload to cloudinary - images or avater, cover image
  // # create user object - insert into database
  // # check if user created successfully or not
  // # remove password and refreshToken from response object
  // # return response

  const { username, email, password, fullName } = req.body;
  console.log({ email });

  // validate empty fields
  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Empty field not allowed");
  }

  // validate user exits
  const userExists = User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExists) {
    throw new ApiError(409, "User already exists");
  }

  // validate avatar or image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image required");
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
