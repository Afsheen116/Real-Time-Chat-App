const express = require("express");
const router = express.Router();

/* 🔐 VERIFY OTP */
router.post("/verify-otp", (req, res) => {
  const { otp, phoneNumber } = req.body;

  console.log("OTP received:", `"${otp}"`);

  // STATIC OTP FOR DEV
  if (String(otp).trim() !== "123456") {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Mock user payload
  const user = {
    phoneNumber,
    name: "Chatify User",
  };

  res.status(200).json({
    message: "OTP verified",
    user,
    token: "dummy-jwt-token",
  });
});

module.exports = router;
