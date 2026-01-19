import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./index.css";

function OtpVerify({ payload, onSuccess }) {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const inputsRef = useRef([]);

  /* ⏱️ RESEND TIMER */
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  /* 📋 AUTO-PASTE FULL OTP */
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;

    const newOtp = pasted.split("");
    setOtp(newOtp);

    newOtp.forEach((_, i) => {
      inputsRef.current[i].value = newOtp[i];
    });
  };

  /* ⌨️ INPUT HANDLER */
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  /* 🔐 VERIFY OTP */
  const verifyOtp = async () => {
    const finalOtp = otp.join("");
    if (finalOtp.length !== 6) {
      setError("Invalid OTP");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/auth/verify-otp",
        { ...payload, otp: finalOtp }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch {
      setError("Wrong OTP");
      setOtp(Array(6).fill(""));
      inputsRef.current[0].focus();
    }
  };

  /* 🔁 RESEND */
  const resendOtp = async () => {
    setTimer(30);
    setError("");
    await axios.post("http://localhost:5000/auth/send-otp", {
      phoneNumber: payload.phoneNumber,
    });
  };

  return (
    <div className="otp-page">
      <div className={`otp-card ${error ? "shake" : ""}`}>
        <h2>Verify OTP</h2>
        <p>Code sent to +91 {payload.phoneNumber}</p>

        <div className="otp-inputs" onPaste={handlePaste}>
          {otp.map((_, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              maxLength={1}
              onChange={(e) => handleChange(e.target.value, i)}
            />
          ))}
        </div>

        {error && <p className="otp-error">{error}</p>}

        <button onClick={verifyOtp}>Verify & Continue</button>

        {timer > 0 ? (
          <p className="timer">Resend OTP in {timer}s</p>
        ) : (
          <p className="resend" onClick={resendOtp}>
            Resend OTP
          </p>
        )}
      </div>
    </div>
  );
}

export default OtpVerify;




