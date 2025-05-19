// cloudinaryConfig.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

let uploadOnCloudinary;

if (process.env.NODE_ENV === "production") {
  // Production: Upload from buffer
  uploadOnCloudinary = (fileBuffer, fileName = "file") => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          public_id: `uploads/${fileName}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(fileBuffer);
    });
  };
} else {
  // Development: Upload from local file path
  uploadOnCloudinary = async (localFilePath) => {
    try {
      if (!localFilePath) return null;

      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
      });

      fs.unlinkSync(localFilePath); // Delete local file after upload
      return response;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      try {
        fs.unlinkSync(localFilePath);
      } catch (unlinkErr) {
        console.error("Failed to delete the local file:", unlinkErr);
      }
      return null;
    }
  };
}

export { uploadOnCloudinary };
