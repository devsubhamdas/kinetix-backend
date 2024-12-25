import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // get access token
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    //verify token
    if (!token) {
      throw new ApiError(401, "Unauthorized request: Token missing");
    }
    
    // decode token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // find user
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    // verify user
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // set user in request object
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, `JWT VERIFICATION ERROR:: ${error?.message}`);
  }
});

export { verifyJWT };
