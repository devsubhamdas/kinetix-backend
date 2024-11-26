import fs from "fs";

const deleteTempFilesOnError = (localFilePaths) => {
  localFilePaths.forEach((filePath) => filePath && fs.unlinkSync(filePath));
};

const parseTags = (tags) => {
  return tags?.split(",").map(tag => tag.trim());
};

export {
  deleteTempFilesOnError,
  parseTags
}