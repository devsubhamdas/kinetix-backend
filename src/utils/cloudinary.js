import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// CONFIGURATION
cloudinary.config({
  cloud_name: process.env.COLUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// HELPER FUNCTIONS
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // remove local saved file as the upload operation completed
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // remove local saved file as the upload operation failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return response;
  } catch (error) {
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
