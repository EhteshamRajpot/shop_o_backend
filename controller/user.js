const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../model/user"); 
const { upload } = require("../multer");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAuthenticated } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

router.post("/create-user", upload.single("avatar"), async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if the email already exists
        const userEmail = await User.findOne({ email });
        if (userEmail) {
            const filename = req.file.filename;
            const filePath = `uploads/${filename}`;
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ message: "Error deleting file" });
                };
            });
            return next(new ErrorHandler("User already exists", 400));
        }

        const filename = req.file.filename;
        const fileUrl = path.join(filename); // Assuming filename is sufficient for the URL

        const user = {
            name: name,
            email: email,
            password: password,
            avatar: fileUrl,
        };
        //  Send Activation Token
        const activationToken = createActivationToken(user);
        const activationUrl = `http://localhost:3000/activation/${activationToken}`;

        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                message: `Hello ${user.email}, please click on the link to activate your account: ${activationUrl}`
            });
            res.status(201).json({
                success: true,
                message: `Please check your email:- ${user.email} to activate your account!`
            })
        } catch (error) {
            return next(new ErrorHandler(error.message, 500))
        }
    } catch (error) {
        // Handle any unexpected errors
        console.error("Error creating user:", error.message);
        return next(new ErrorHandler("Error creating user", 500));
    }
});

// create activation token
const createActivationToken = (user) => {
    return jwt.sign(user, process.env.ACTIVATION_SECRET, {
        expiresIn: "5m"
    })
}

// activate user      
router.post("/activation", catchAsyncErrors(async (req, res, next) => {
    try {
        const { activation_token } = req.body;
        const newUser = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);

        if (!newUser) {
            return next(new ErrorHandler("Invalid token", 400));
        };
        const { name, email, password, avatar } = newUser;
        let user = await User.findOne({ email });
        if (user) {
            return next(new ErrorHandler("User already exists", 400))
        }
        user = await User.create({
            name,
            email,
            password,
            avatar
        });
        sendToken(user, 201, res);
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

// login user
router.post("/login-user", catchAsyncErrors(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler("Please provide all the fields!", 400));
        }
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler("User doesn't exists!", 400));
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return next(new ErrorHandler("Please provide the correct information", 400));
        }
        sendToken(user, 201, res)
    } catch (error) {
        return next(new ErrorHandler(error?.message, 500))
    }
}))

// load user
router.get("/getuser", isAuthenticated, catchAsyncErrors(async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new ErrorHandler("User doesn't exists!", 400));
        }

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return next(new ErrorHandler(error?.message, 500))
    }
}))

// log out user

router.get("/logout", isAuthenticated, catchAsyncErrors(async (req, res, next) => {
    try {
        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true
        });

        res.status(201).json({
            success: true, 
            message: "Log out successfully!"
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
}))

module.exports = router; 