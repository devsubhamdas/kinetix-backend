import fs from "fs";

const deleteTempFilesOnError = (localFilePaths) => {
  localFilePaths.forEach((filePath) => filePath && fs.unlinkSync(filePath));
};

export {
  deleteTempFilesOnError
}