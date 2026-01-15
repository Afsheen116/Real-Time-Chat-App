const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

/* 📩 REQUEST OTP (MOCK) */
router.post("/request", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number required" });
  }

  // 🔐 MOCK OTP
  const otp = "123456";

  // store temporarily (mock)
  global.otpStore = global.otpStore || {};
  global.otpStore[phoneNumber] = otp;

  console.log("OTP sent (mock):", otp);

  res.json({ success: true });
});

/* 🔐 VERIFY OTP */
router.post("/verify", async (req, res) => {
  console.log("🔥 /auth/verify HIT");
  console.log("BODY:", req.body);
  const { phoneNumber, otp } = req.body;
  console.log("PHONE:", phoneNumber);
  console.log("OTP:", otp, typeof otp);



  if (
    !global.otpStore ||
    global.otpStore[phoneNumber] !== otp
  ) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  try {
    let user = await User.findOne({ phoneNumber });
    let isNewUser = false;

    if (!user) {
      user = await User.create({ phoneNumber });
      isNewUser = true;
    }

    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    delete global.otpStore[phoneNumber];

    res.json({ token, user, isNewUser });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
