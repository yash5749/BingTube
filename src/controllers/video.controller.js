import mongoose, {isValidObjectId, set} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { deleteFromCloudinary } from "../utils/couldinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

// ########## PUBLISH VIDEOS

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path || ""
    if(!videoLocalPath) {
        throw new ApiError(400, "Invalid File Path")
    }

    const uploadedVideo = await uploadOnCloudinary(videoLocalPath);
    if(!uploadedVideo) {
        throw new ApiError(400,"Video is Required")
    }

    const duration = uploadedVideo.duration; 

    if (!duration) {
        throw new ApiError(500, "Cannot fetch video duration from Cloudinary");
    }

    const video = await Video.create({
        videoFile: uploadedVideo.url ,
        title,
        description,
        duration,
        owner: req.user._id

    })

    return res.status(201).json(
        new ApiResponse(201, video, "Video uploaded successfully")
    );

})

// ########## GET VIDEO BY ID

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video Id is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // owner or public video
    const isOwner = req.user?._id && (req.user._id.toString() === video.owner.toString());

    if (video.isPublished || isOwner) {
        return res
            .status(200)
            .json(new ApiResponse(200, video, "Video fetched successfully"));
    }

    // not published AND not owner
    throw new ApiError(403, "OOPs Video Seems To Be Private");
});

// ########## UPDATE VIDEO
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const currVideo = await Video.findById(videoId);
    if (!currVideo) {
        throw new ApiError(404, "Video not found");
    }

    const isOwner = currVideo.owner.toString() === req.user._id.toString();
    if (!isOwner) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const { title, description } = req.body;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if (!title && !description && !thumbnailPath) {
        throw new ApiError(400, "At least one field (title/description/thumbnail) is required");
    }

    let updateObj = {};

    if (title) updateObj.title = title;
    if (description) updateObj.description = description;

    // Handle thumbnail upload
    if (thumbnailPath) {
        const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath);
        if (!uploadedThumbnail || !uploadedThumbnail.secure_url) {
            throw new ApiError(400, "Thumbnail upload failed");
        }

        updateObj.thumbnail = uploadedThumbnail.url;
    }

    // Update video
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateObj },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    );
});

// ########## DELETE VIDEO 
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const currVideo = await Video.findById(videoId);
    if (!currVideo) {
        throw new ApiError(404, "Video not found");
    }

    const isOwner = currVideo.owner.toString() === req.user._id.toString();
    if (!isOwner) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    // Extract Cloudinary public_id from URL
    const videoUrl = currVideo.videoFile;
    const public_id = videoUrl
        .split("/")
        .slice(-2)
        .join("/")
        .replace(/\.[^/.]+$/, "");

    // Delete from Cloudinary
    try {
        await deleteFromCloudinary(public_id)
    } catch (error) {
        throw new ApiError(500, "Failed to delete video from Cloudinary");
    }

    // Delete from MongoDB
    const result = await Video.deleteOne({ _id: videoId });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Video deleted successfully"));
});

// ########## TOGGLE VIDEO PRIVACY
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const currVideo = await Video.findById(videoId);
    if (!currVideo) {
        throw new ApiError(404, "Video not found");
    }

    const isOwner = currVideo.owner.toString() === req.user._id.toString();
    if (!isOwner) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !currVideo.isPublished
            }
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Updated video privacy setting")
    );
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}