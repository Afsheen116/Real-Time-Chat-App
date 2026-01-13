const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
        },
        name: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
