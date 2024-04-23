

import jwt, { JwtPayload } from "jsonwebtoken"
import { ApiError } from "../utils/api_error";
import { asyncHandler } from "../utils/async_handler";
import { NextFunction,Request } from "express";
import { User } from "../models/user.model";


interface CustomRequest extends Request {
        cookies: {
        accessToken?: string;
    }
  
    user?: any; // Define the type according to your User model
}

export const verifyJWT = asyncHandler(async (req:CustomRequest, _ ,next:NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || '')
    
        if (!decodedToken || typeof decodedToken !== 'object' || !('_id' in decodedToken)) {
            throw new ApiError(401, "Invalid Access Token")
        }
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error:any) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
});


