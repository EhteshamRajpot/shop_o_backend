const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Shop = require("../model/shop");
const { upload } = require("../multer");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isSeller } = require("../middleware/auth");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendShopToken = require("../utils/shopToken");

// create-shop
router.post("/create-shop", upload.single("avatar"), async (req, res, next) => {
    try {
        const { email } = req.body;
        const sellerEmail = await Shop.findOne({ email });
        if (sellerEmail) {
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

        const seller = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            avatar: fileUrl,
            address: req.body.address,
            phoneNumber: req.body.phoneNumber,
            zipCode: req.body.zipCode
        };
        //  Send Activation Token
        const activationToken = createActivationToken(seller);
        const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;
        try {
            await sendMail({
                email: seller.email,
                subject: "Activate your shop",
                message: `Hello ${seller.email}, please click on the link to activate your shop: ${activationUrl}`
            });
            res.status(201).json({
                success: true,
                message: `Please check your email:- ${seller.email} to activate your shop!`
            })
        } catch (error) {
            return next(new ErrorHandler(error.message, 500))
        }
    } catch (error) {
        // Handle any unexpected errors
        console.error("Error creating user:", error.message);
        return next(new ErrorHandler("Error creating user", 500));
    }
})

// create activation token
const createActivationToken = (user) => {
    return jwt.sign(user, process.env.ACTIVATION_SECRET, {
        expiresIn: "5m"
    })
}

// activate shop
router.post("/activation", catchAsyncErrors(async (req, res, next) => {
    try {
        const { activation_token } = req.body;
        const newSeller = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);

        if (!newSeller) {
            return next(new ErrorHandler("Invalid token", 400));
        };
        const { name, email, password, avatar, zipCode, address, phoneNumber } = newSeller;
        let seller = await Shop.findOne({ email });
        if (seller) {
            return next(new ErrorHandler("Seller already exists", 400))
        }
        seller = await Shop.create({
            name,
            email,
            password,
            avatar,
            zipCode,
            address,
            phoneNumber
        });
        sendShopToken(seller, 201, res);
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

// login shop
router.post("/login-shop", catchAsyncErrors(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler("Please provide all the fields!", 400));
        }
        const user = await Shop.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler("User doesn't exists!", 400));
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return next(new ErrorHandler("Please provide the correct information", 400));
        }
        sendShopToken(user, 201, res)
    } catch (error) {
        return next(new ErrorHandler(error?.message, 500))
    }
}))

// load shop
router.get(
    "/getSeller",
    isSeller,
    catchAsyncErrors(async (req, res, next) => {
        try {
            const seller = await Shop.findById(req.seller._id);

            if (!seller) {
                return next(new ErrorHandler("User doesn't exists", 400));
            }

            res.status(200).json({
                success: true,
                seller,
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);


module.exports = router;  