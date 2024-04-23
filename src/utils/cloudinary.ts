import dotenv from 'dotenv'
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import { ApiError } from './api_error'

dotenv.config()
  

const cloudName=process.env.CLOUDINARY_CLOUD_NAME 
const apiKey=process.env.CLOUDINARY_API_KEY 
const apiSecret=process.env.CLOUDINARY_API_SECRET

cloudinary.config({ 
  cloud_name: cloudName, 
  api_key: apiKey, 
  api_secret: apiSecret
})


const uploadOnCloudinary = async (localFilePath:any) => {
  
    
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

const getDataCloudinary = async (publicId:string) =>{
    try{
        const response = cloudinary.url(publicId)

        return response

    }
    catch (error) {
        throw new ApiError(500,'something error in Cloudinary')
    }
}

//https://imagekit.io/ you also use imagekit.io also




export {uploadOnCloudinary,getDataCloudinary}