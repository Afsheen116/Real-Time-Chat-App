import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./index.css";

import Login from "./pages/login";
import OtpVerify from "./pages/OTPVerify";

const socket = io("http://localhost:5000", { autoConnect: false });

function App() {
  /* 🔐 AUTH */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authStep, setAuthStep] = useState("login");
  const [otpPayload, setOtpPayload] = useState(null);

  /* 💬 CHAT */
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");

  /* ✍️ TYPING */
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef(null);

  /* 🔹 AUTO LOGIN */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  /* 🔌 SOCKET CONNECT (SINGLE SOURCE OF TRUTH) */
  useEffect(() => {
    if (!isAuthenticated || !user?.phoneNumber) return;

    socket.connect();
    socket.emit("user_online", user.phoneNumber);

    socket.on("receive_message", (msg) => {
      setChat((prev) => {
        // ignore own echoed message
        if (msg.sender === user.phoneNumber) return prev;
        return [...prev, msg];
      });
    });

    socket.on("user_typing", ({ conversationId, user: typingUser }) => {
      if (selectedConversation?._id === conversationId) {
        setTypingUser(typingUser);
      }
    });

    socket.on("user_stop_typing", ({ conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setTypingUser("");
      }
    });

    socket.on("message_status_update", (updatedMsg) => {
      setChat((prev) =>
        prev.map((m) =>
          m._id === updatedMsg._id ? updatedMsg : m
        )
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("message_status_update");
    };
  }, [isAuthenticated, user, selectedConversation]);

  /* 📥 LOAD CONVERSATIONS */
  useEffect(() => {
    if (!user?.phoneNumber) return;

    axios
      .get(`http://localhost:5000/conversations/${user.phoneNumber}`)
      .then((res) => setConversations(res.data))
      .catch(console.error);
  }, [user]);

  /* 👀 MARK MESSAGES AS SEEN */
  useEffect(() => {
    if (!selectedConversation || !chat.length) return;

    chat.forEach((msg) => {
      if (msg.sender !== user.phoneNumber && msg.status !== "seen") {
        socket.emit("message_seen", msg._id);
      }
    });
  }, [chat, selectedConversation, user]);

  /* ✍️ HANDLE TYPING */
  const handleTyping = (value) => {
    setMessage(value);
    if (!selectedConversation) return;

    socket.emit("typing", {
      conversationId: selectedConversation._id,
      user: user.phoneNumber,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", selectedConversation._id);
    }, 800);
  };

  /* 📤 SEND MESSAGE */
  const sendMessage = () => {
    if (!message.trim() || !selectedConversation) return;

    const optimisticMsg = {
      _id: Date.now(),
      conversationId: selectedConversation._id,
      sender: user.phoneNumber,
      content: message,
      status: "delivered",
    };

    // optimistic UI
    setChat((prev) => [...prev, optimisticMsg]);

    socket.emit("send_message", {
      conversationId: selectedConversation._id,
      sender: user.phoneNumber,
      content: message,
    });

    socket.emit("stop_typing", selectedConversation._id);
    setMessage("");
  };

  /* 🔓 LOGOUT */
  const logout = () => {
    localStorage.clear();
    socket.disconnect();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedConversation(null);
    setChat([]);
    setAuthStep("login");
  };

  /* 🔐 AUTH GATE */
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

  /* 💬 UI */
  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Chatify</h3>
          <button onClick={logout}>Logout</button>
        </div>

        <div className="contacts">
          {conversations.map((c) => {
            const otherUser = c.participants.find(
              (p) => p !== user.phoneNumber
            );

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

      <div className="chat-window">
        {!selectedConversation ? (
          <div className="empty-chat">Select a chat</div>
        ) : (
          <>
            <div className="chat-header">
              {selectedConversation.participants.find(
                (p) => p !== user.phoneNumber
              )}
            </div>

            <div className="chat-box">
              {chat.map((msg) => (
                <div
                  key={msg._id}
                  className={`message ${
                    msg.sender === user.phoneNumber ? "you" : "other"
                  }`}
                >
                  {msg.content}
                  <span className="status">
                    {msg.status === "seen" ? "✔✔" : "✔"}
                  </span>
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
