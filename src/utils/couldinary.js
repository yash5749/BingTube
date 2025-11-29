import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiResponse } from "./ApiResponse";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,   
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("File uploaded to Cloudinary:", result.url);

    //remove from local after upload
    
       fs.unlinkSync(localFilePath);
    

    return result;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    const res = await cloudinary.uploader.destroy(public_id);
    return res;
  } catch (error) {
    console.log("Cloudinary deletion error:", error);
    throw new Error("Unable to delete image from Cloudinary");
  }
};



export { uploadOnCloudinary, deleteFromCloudinary};
