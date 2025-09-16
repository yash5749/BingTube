import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/couldinary.js"



const registerUser = asyncHandler( async (req, res) => {

    //email check
    //password check
    //if already regestered then back to login page
    //fake sign up prevent
    //password nessasity

    const {fullName, email, username, password}=req.body
    console.log(email);

   if (
        [fullName,email,username,password].some((field) => field?.trim() === "" )
   ) {
        throw new ApiError(400, "All fields are required")
   }

   const existedUser = await User.findOne({
        $or:[{ email } ,{ username }]
   })

   if(existedUser){
    throw new ApiError(409, "User Alredy Registerd")
   }

   const avatarLocalPath = req.files?.avatar[0]?.path
   const coverImageLocalPath = req.files?.coverImage?.[0]?.path || ""

   if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is Reqired")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   if(!avatar){
        throw new ApiError(400, "Avatar is Required")
   }

    const user = await User.create({
        fullName,
        email,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        password,
        username : username.toLowerCase()
   })
   const createdUser = await User.findById(user._id).select(
       " -password -refreshToken"
   )
   if(!createdUser){
        throw new ApiError(501, "Something went wrong while registering the user")
   }

   return res.status(201).json(
        new ApiResponse(200, createdUser, "User regestred succesfully")
   )

    
})

export {registerUser}