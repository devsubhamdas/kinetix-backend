import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, __) => {
  console.error(err);

  if (err instanceof ApiError) {
    return err.toJson(res);
  }

  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      success: false,
      code: "CSRF_TOKEN_INVALID",
      message: "Invalid or missing CSRF token",
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message,
  });
};

export { errorHandler };
