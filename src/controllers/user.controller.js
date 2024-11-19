import {asyncHandler} from "../utils/asyncHandler.js"   
import {ApiError} from "../utils/ApiError.js" 
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"



const generateAccessAndRefreshTokens = async(userId) => {
  try {
    // access token get by user
    // refresh token is saved in database
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {refreshToken, accessToken}


  } catch (error) {
    throw new ApiError(500, "Something went wrong while generation access and refresh token")
  }
}

const registerUser = asyncHandler( async (req, res) => {
  //get user detail from frontend
  // validation- not empty
  // check if user already exists :username, email
  // check for image check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const {fullName, username, email, password} = req.body

  console.log("email: ", email);

  if(
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ){
    throw new ApiError(400," All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if(existedUser){
    throw new ApiError(409, "User with username or email already exist")
  }
  
  const avatarLocalPath = req.files?.avatar[0]?.path 
  // const coverImageLocalPath = req.files?.coverImage[0]?.path

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0 ){
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if(!avatarLocalPath){
    throw new ApiError(400, "avatar is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400, "avatar is required")
  }
  
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
   
  if(!createdUser){
    throw new ApiError(500, "something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )


} )


const loginUser = asyncHandler( async (req, res) => {
  // get data from req body
  // username or email base access
  // find the user
  // password check
  // access token and refresh token send
  // send cookie

  const {username, email, password} = req.body

  if(!username || !email){
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if(!user){
    throw new ApiError(404, "user does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "password incorrect")
  }

  const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

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
        user:loggedInUser, accessToken,
        refreshToken

      },
      "User loggedIn successfully"
    )
  )

  



  
})

const logoutUser = asyncHandler(async(req,res) => {
     User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined
        },
        
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
    .clearcookie("accessToken", options)
    .clearcookie("refreshToken", options)
    .json(new ApiResponse(200, {} , "User logged Out "))
})

export {registerUser,
  loginUser, logoutUser
}