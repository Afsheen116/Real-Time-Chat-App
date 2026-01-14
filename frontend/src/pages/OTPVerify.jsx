import { useState } from "react";
import axios from "axios";

export default function OtpVerify({ payload, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/auth/verify", {
        phoneNumber: payload.mode === "phone" ? payload.value : undefined,
        email: payload.mode === "email" ? payload.value : undefined,
        otp,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onSuccess();
    } catch (err) {
      alert("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Enter OTP</h2>

      <input
        placeholder="123456"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button onClick={verifyOtp} disabled={loading}>
        {loading ? "Verifying..." : "Verify"}
      </button>
    </div>
  );
}

