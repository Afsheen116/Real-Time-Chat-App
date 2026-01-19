import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./index.css";

import Login from "./pages/login";
import OtpVerify from "./pages/OTPVerify";

const socket = io("http://localhost:5000", { autoConnect: false });

function App() {
  /* ================= AUTH ================= */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authStep, setAuthStep] = useState("login");
  const [otpPayload, setOtpPayload] = useState(null);

  const phoneNumber = user?.phoneNumber; // ✅ SAFE ACCESS

  /* ================= CHAT ================= */
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");

  /* ================= TYPING ================= */
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef(null);

  /* ================= AUTO LOGIN ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  /* ================= SOCKET CONNECT ================= */
  useEffect(() => {
    if (!isAuthenticated || !phoneNumber) return;

    socket.connect();
    socket.emit("user_online", phoneNumber);

    socket.on("receive_message", (msg) => {
      setChat((prev) =>
        prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
      );
    });

    socket.on("user_typing", (user) => {
      setTypingUser(user);
    });

    socket.on("user_stop_typing", () => {
      setTypingUser("");
    });

    socket.on("message_status_update", ({ messageId, status }) => {
      setChat((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, status } : m
        )
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("message_status_update");
    };
  }, [isAuthenticated, phoneNumber]);

  /* ================= LOAD CONVERSATIONS ================= */
  useEffect(() => {
    if (!phoneNumber) return;

    axios
      .get(`http://localhost:5000/conversations/${phoneNumber}`)
      .then((res) => setConversations(res.data))
      .catch(console.error);
  }, [phoneNumber]);

  /* ================= MARK AS SEEN ================= */
  useEffect(() => {
    if (!selectedConversation || !phoneNumber) return;

    chat.forEach((msg) => {
      if (msg.sender !== phoneNumber && msg.status !== "seen") {
        socket.emit("message_seen", { messageId: msg._id });
      }
    });
  }, [chat, selectedConversation, phoneNumber]);

  /* ================= TYPING ================= */
  const handleTyping = (value) => {
    setMessage(value);
    if (!selectedConversation || !phoneNumber) return;

    socket.emit("typing", {
      conversationId: selectedConversation._id,
      user: phoneNumber,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        conversationId: selectedConversation._id,
      });
    }, 800);
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = () => {
    if (!message.trim() || !selectedConversation || !phoneNumber) return;

    socket.emit("send_message", {
      conversationId: selectedConversation._id,
      sender: phoneNumber,
      content: message,
    });

    setMessage("");
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.clear();
    socket.disconnect();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedConversation(null);
    setChat([]);
    setAuthStep("login");
  };

  /* ================= AUTH GATE ================= */
  if (!isAuthenticated) {
    if (authStep === "login") {
      return (
        <Login
          onOtpSent={(data) => {
            setOtpPayload(data);
            setAuthStep("otp");
          }}
        />
      );
    }

    if (authStep === "otp" && otpPayload) {
      return (
        <OtpVerify
          payload={otpPayload}
          onSuccess={(userData) => {
            setUser(userData);
            setIsAuthenticated(true);
          }}
        />
      );
    }

    return null;
  }

  /* ================= UI ================= */
  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Chatify</h3>
          <button onClick={logout}>Logout</button>
        </div>

        <div className="contacts">
          {conversations.map((c) => {
            const otherUser = phoneNumber
              ? c.participants.find((p) => p !== phoneNumber)
              : "";

            return (
              <div
                key={c._id}
                className="contact"
                onClick={async () => {
                  setSelectedConversation(c);
                  socket.emit("join_conversation", c._id);

                  const res = await axios.get(
                    `http://localhost:5000/messages/${c._id}`
                  );
                  setChat(res.data);
                }}
              >
                <strong>{otherUser}</strong>
                <p>{c.lastMessage || "Tap to chat"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className="chat-window">
        {!selectedConversation ? (
          <div className="empty-chat">Select a chat</div>
        ) : (
          <>
            <div className="chat-header">
              {selectedConversation.participants.find(
                (p) => p !== phoneNumber
              )}
            </div>

            <div className="chat-box">
              {chat.map((msg) => (
                <div
                  key={msg._id}
                  className={`message ${
                    msg.sender === phoneNumber ? "you" : "other"
                  }`}
                >
                  <div>{msg.content}</div>

                  <div className="message-meta">
                    <small>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>

                    {msg.sender === phoneNumber && (
                      <span className="ticks">
                        {msg.status === "seen" ? "✔✔" : "✔"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {typingUser && (
              <div className="typing-indicator">
                {typingUser} is typing…
              </div>
            )}

            <div className="chat-input">
              <input
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
              />

              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!message.trim()}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
