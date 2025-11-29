import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
    
    const token = req.cookies?.accessToken 
               || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request - No token found");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if (!user) {
            
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()

    } catch (err) {
        // console.log("🔴 JWT error:", err.message);
        throw new ApiError(401, "Unauthorized request");
    }
});


export {verifyJWT}