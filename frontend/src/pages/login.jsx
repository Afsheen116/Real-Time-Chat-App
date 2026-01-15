import { useState } from "react";
import axios from "axios";

export default function Login({ onOtpSent }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!phoneNumber) return alert("Enter phone number");

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/auth/request", {
        phoneNumber,
      });

      onOtpSent({ phoneNumber });
    } catch (err) {
      alert("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome to Chatify</h2>

      <input
        placeholder="+91XXXXXXXXXX"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />

      <button onClick={sendOtp} disabled={loading}>
        {loading ? "Sending..." : "Continue"}
      </button>
    </div>
  );
}

