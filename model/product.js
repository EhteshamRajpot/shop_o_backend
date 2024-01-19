const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter your product name!"]
    },
    description: {
        type: String,
        required: [true, "Please enter your product description!"]
    },
    category: {
        type: String,
        required: [true, "Please enter your product category!"]
    },
    tags: {
        type: String,
        required: [true, "Please enter your product tags!"]
    },
    originalPrice: {
        type: Number,
        required: [true, "Please enter the original Price!"]
    },
    discountPrice: {
        type: Number,
        required: [true, "Please enter your product price!"]
    },
    stock: {
        type: Number,
        required: [true, "Please enter your product stock!"]
    },
    images: [
        {
            type: String
        }
    ],
    shop: {
        type: Object,
        required: true,
    },
    sold_out: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model("Product", productSchema)