import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true           //use index true on searching
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,          
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video"
      }                                      //array because we add multiple value in this

    ],
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    refreshToken: {
      type: String
    }
  },
  {
    timestamps: true
  }

)
//arrow function cannot be used as we want this reference(or we dont know context because save event user me chal rha hai)

userSchema.pre("save",async function (next) {
  if(!this.isModified("password")) return next();
  this.password = bcrypt.hash(this.password, 10)
  next()
})  
userSchema.methods.isPasswordCorrect = async function (password){
  return await bcrypt.compare(password, this.password)
}  

userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id : this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id : this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User = mongoose.model("User", userSchema)