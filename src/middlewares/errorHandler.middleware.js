import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return err.toJson(res);
  } else {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { errorHandler };
