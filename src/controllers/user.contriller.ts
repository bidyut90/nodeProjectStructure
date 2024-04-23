import { ApiError } from '../utils/api_error';
import { asyncHandler } from '../utils/async_handler';
import { NextFunction, Request, Response } from 'express';
import { User } from '../models/user.model';
import { uploadOnCloudinary } from '../utils/cloudinary'
import { ApiResponse } from '../utils/api_response';
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';


interface CustomRequest extends Request {
  user?: any; // Adjust the type according to your user object
}

//generated accesses token and refresh toke 

const generatedAcessAndRefreshTokens = async (userid: string) => {
  try {
    const user = await User.findById(userid);
    if (user) {
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken

      await user.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }

    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw new ApiError(500, 'something weant wrong wile gernerated access token and refresh token')
  }
}

const registerUser = asyncHandler(
  async (req: Request & { files: { [fieldname: string]: Express.Multer.File[] } }, res: Response, next: NextFunction) => {
    //get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { username, email, fullName, password } = req.body;
    if ([fullName, email, username, password].some(field => !field || field.trim() === '')) {
      throw new ApiError(400, 'All fields are required');
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser) {
      throw new ApiError(400, 'User with email or username already exists');
    }

    // Accessing avatar file path if it exists
    const avatarLocalFilePath = req.files?.avatar && req.files.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage && req.files.coverImage[0]?.path
    console.log(avatarLocalFilePath)

    if (!avatarLocalFilePath) {
      throw new ApiError(400, "avatar localfiles is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalFilePath)
    console.log('avatar details', avatar)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
      throw new ApiError(400, 'avatar file is required')
    }
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || '',
      email,
      password,
      username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )
    if (!createdUser) {
      throw new ApiError(500, 'somthing wronge creating user ')
    }

    return res.status(201).json(
      new ApiResponse(200, createdUser, 'User Register Sucessfuly')
    )

  }
);


const loginUser = asyncHandler(
  async (req: Request, res: Response) => {
    // req body -> data
    // username or email
    // find the user 
    //password check
    //access and refresh token
    //send cookie

    const { email, username, password } = req.body
    console.log(username)



    if (!username && !email) {
      throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({
      $or: [{ username }, { email }]
    })

    if (!user) {
      throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)


    if (!isPasswordValid) {
      throw new ApiError(401, 'invalid user Crediational')
    }


    const { accessToken, refreshToken } = await generatedAcessAndRefreshTokens(user._id)




    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    if (!loggedInUser) {
      throw new ApiError(401, 'user details not found ')
    }

    const options = {
      httpOnly: true,
      secure: true
    }
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser, accessToken, refreshToken
          },
          "User logged In Successfully"
        )
      )
  }
)

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 // this removes the field from document
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {


  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET || '');
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (typeof decodedToken !== 'object' || !decodedToken._id) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(decodedToken._id);

  if (!user) {
    throw new ApiError(401, 'Invalid refresh token')
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, 'Refresh token is expird or used')
  }
  const options = {
    http: true,
    secure: true
  }
  const { accessToken, refreshToken } = await generatedAcessAndRefreshTokens(user._id)

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(200,
        {
          accessToken, newrefreshToken: refreshToken
        },
        "Access token refreshed"
      )
    )

  // Continue with your logic...
})






const changeCurrentPassword = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id)

  if (!user) {
    throw new ApiError(401, 'User not found. Please log in.');
  }

  const isPasswordCorrect = await user?.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Password is incorrect.');
  }

  if (newPassword === oldPassword) {
    throw new ApiError(400, 'New password must be different from old password.');
  }

  // Update the user's password
  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  // Respond with success message
  return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully.'));
})


const getCurrentUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "message get sucessfully "))
})

const updateAccountDetails = asyncHandler(async (req: CustomRequest, res: Response) => {

  const { fullName, email } = req.body

  if (!fullName || !email) {
    throw new ApiError(400, "all fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'account details updated sucessfully'))


})

const updateUserAvatra = asyncHandler(async (req: CustomRequest, res: Response) => {

  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing ")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar?.url) {
    throw new ApiError(400, 'Error while uploading on avatar')
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, {
    $set: {
      avatar: avatar.url
    }

  },
    { new: true }
  ).select('-password')

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, 'Avtar sucessfuly')
    )


})


const updateUserCoverImage = asyncHandler(async (req: CustomRequest, res: Response) => {

  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(401, 'Cover image file is missing')
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (coverImage?.url) {
    throw new ApiError(401, 'Cover image not upload in Cloudnarry')
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,

    {
      $set: {
        coverImage: coverImage?.url
      }
    },
    { new: true }
  ).select('-password')

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, 'update sucessfully')
    )

})

const getUserChannelProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { username } = req.params
  if (!username?.trim()) {
    throw new ApiError(400, 'user name is missing')
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLocaleLowerCase
      }
    }, {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      },
    }
    ,
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribedTo'
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount:{
          $size:"subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }

      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
    }
    }

  ])

  if(!channel?.length){
    throw new ApiError(400,'Channel not exist')
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,channel[0],
      "User channel Fetch Sucessfully")
  )



})


const getWatchHistory = asyncHandler(async(req:CustomRequest, res:Response) => {
  const user = await User.aggregate([
      {
          $match: {
              _id: new mongoose.Types.ObjectId(req.user._id)
          }
      },
      {
          $lookup: {
              from: "videos",
              localField: "watchHistory",
              foreignField: "_id",
              as: "watchHistory",
              pipeline: [
                  {
                      $lookup: {
                          from: "users",
                          localField: "owner",
                          foreignField: "_id",
                          as: "owner",
                          pipeline: [
                              {
                                  $project: {
                                      fullName: 1,
                                      username: 1,
                                      avatar: 1
                                  }
                              }
                          ]
                      }
                  },
                  {
                      $addFields:{
                          owner:{
                              $first: "$owner"
                          }
                      }
                  }
              ]
          }
      }
  ])

  return res
  .status(200)
  .json(
      new ApiResponse(
          200,
          user[0].watchHistory,
          "Watch history fetched successfully"
      )
  )
})





export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateAccountDetails,
  changeCurrentPassword,
  updateUserAvatra,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}
