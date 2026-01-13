import { useState } from "react";
import axios from "axios";

export default function Login({ onOtpSent }) {
  const [mode, setMode] = useState("phone"); // phone | email
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    if (!value) return alert("Enter phone or email");

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/auth/request", {
        phoneNumber: mode === "phone" ? value : undefined,
        email: mode === "email" ? value : undefined,
      });

      onOtpSent({ mode, value });
    } catch (err) {
      alert("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome to Chatify</h2>

      <div className="auth-toggle">
        <button
          className={mode === "phone" ? "active" : ""}
          onClick={() => setMode("phone")}
        >
          Phone
        </button>
        <button
          className={mode === "email" ? "active" : ""}
          onClick={() => setMode("email")}
        >
          Email
        </button>
      </div>

      <input
        placeholder={
          mode === "phone" ? "+91XXXXXXXXXX" : "email@example.com"
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <button onClick={requestOtp} disabled={loading}>
        {loading ? "Sending..." : "Continue"}
      </button>
    </div>
  );
}
