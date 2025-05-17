import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
    secure:true,        
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" // Auto detects image or video type
        });

        // Delete the local file after upload
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch (err) {
        console.error('Cloudinary upload error:', err);  // Log the error for better debugging
        try {
            fs.unlinkSync(localFilePath);  // Try to delete the file even if upload fails
        } catch (unlinkErr) {
            console.error('Failed to delete the local file:', unlinkErr);
        }
        return null;
    }
};

export { uploadOnCloudinary };
