import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/couldinary.js";
import jwt from "jsonwebtoken";

// ###########  ACCESS TOKEN GENERATE AND REFRESH

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// ###########  REGISTER USER

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log(req.body);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User Alredy Registerd");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path || "";

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is Reqired");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is Required");
  }

  const user = await User.create({
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    " -password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(501, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User regestred succesfully"));
});

// ###########  LOGIN USER

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "UserName or Email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Wrong Password");
  }
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

// ###########  LOGOUT USER

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out "));
});

// ###########  REFRESH ACCES TOKEN

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorise Request");
  }
  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  if (!decodedToken) {
    throw new ApiError(404, "Token not decoded");
  }

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }
  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Unauthorized token");
  }
  const options = {
    secure: true,
    httpOnly: true,
  };

  const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  return res
    .status(200)
    .cookies("accessToken", accessToken)
    .cookies("refreshToken", newRefreshToken)
    .json(200, { accessToken, newRefreshToken });
});

// ###########  CHANGE CURRENT PASSWORD

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(404, "wrong password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(201, {}, "Password Chnaged Successfully"));
});

// ###########  FETCH CURRENT USER

const currentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

// ###########  UPDATE ACCOUNT DETAILS

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// ###########  UPDATE AVATAR
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  
  if (!avatar.url) {
       throw new ApiError(400, "Error while uploading on avatar");
     }
     

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: false }
  ).select("-password");
  
  if (user.avatar) {
    const public_id = oldUser.avatar.split("/").slice(-2).join("/").replace(/\.[^/.]+$/, "");
    await deleteFromCloudinary(public_id);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

//###########  UPDATE COVERIMAGE

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: false }
  ).select("-password");

  if (user.avatar) {
    const public_id = oldUser.avatar.split("/").slice(-2).join("/").replace(/\.[^/.]+$/, "");
    await deleteFromCloudinary(public_id);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  currentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
