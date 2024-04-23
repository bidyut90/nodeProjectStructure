import mongoose, { Schema, Document, Model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Interface for user document
interface IUserDocument extends Document {
    username?: string;
    email?: string;
    fullName?: string;
    avatar?: string;
    coverImage?: string;
    watchHistory?: mongoose.Types.ObjectId[];
    password: string;
    refreshToken?: string;

    // Declare methods
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
}

// Interface for user model (to include methods)
interface IUserModel extends Model<IUserDocument> {
    // Static methods (if any)
}

const userSchema = new Schema<IUserDocument, IUserModel>({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true
    },
    coverImage: {
        type: String
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String
    }
},
    {
        timestamps: true
    });

// Hashing the password before saving
userSchema.pre<IUserDocument>("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to check if the password is correct
userSchema.methods.isPasswordCorrect = async function(password:string){
 
    return await bcrypt.compare(password, this.password)
}

// Method to generate access token
userSchema.methods.generateAccessToken = function (this: IUserDocument): string {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET || "",
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d"
        }
    );
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function (this: IUserDocument): string {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET || "",
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d"
        }
    );
};

// Exporting the user model
export const User: IUserModel = mongoose.model<IUserDocument, IUserModel>("User", userSchema);
