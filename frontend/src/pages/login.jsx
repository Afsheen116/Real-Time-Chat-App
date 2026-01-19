import { useState } from "react";
import "./login.css";

export default function Login({ onOtpSent }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (phone.length !== 10) return alert("Enter valid 10 digit number");

    setLoading(true);

    // simulate OTP API (you already have backend)
    setTimeout(() => {
      onOtpSent({ phoneNumber: phone });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="login-wrapper">
      <div className="login-glass">
        <h1 className="login-title">Chatify</h1>
        <p className="login-subtitle">
          Real-time conversations. Reimagined.
        </p>

        <div className="login-input-group">
          <span className="country-code">+91</span>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          className="login-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Sending OTP..." : "Continue"}
        </button>

        <p className="login-footer">
          Secured with OTP authentication 🔒
        </p>
      </div>
    </div>
  );
}


