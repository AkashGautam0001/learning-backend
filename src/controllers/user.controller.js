import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.refreshAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh token."
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    //get user details from fronted
    //validation - not empty
    //check if user already exists : username, email
    //check for images, check for avator
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for use creation
    //return res
    const { fullName, email, username, password } = req.body;
    console.log(fullName, email, username, password);

    // if (fullName === "") {
    //     throw new ApiError(400, "fullName is required.");
    // }

    if (
        [fullName, email, username, password].some((field) => {
            field?.trim() === "";
        })
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const exitedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (exitedUser) {
        throw new ApiError(409, "User with email or username already exits");
    }

    const avatorLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // console.log(avator, coverImage);

    if (!avatorLocalPath) {
        throw new ApiError(400, "Avator file is required");
    }

    const avator = await uploadOnCloudinary(avatorLocalPath);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avator) {
        throw new ApiError(400, "Avator file is required");
    }
    const user = await User.create({
        fullName,
        avatar: avator.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something  went wrong by registering user");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User Registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    //password check
    //access and refresh token, send to user
    // send in secure cookie
    // response

    const { email, username, password } = req.body;

    if (!username || !email) {
        throw new ApiError(400, "username or email is required");
    }

    if (!password) {
        throw new ApiError(400, "password is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "User is not found.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password); //focus: it is user not User

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        //secure cookies
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
                "User login Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
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
        .json(new ApiResponse(200, {}, "User Logged Out"));
});

export { registerUser, loginUser, logoutUser };
