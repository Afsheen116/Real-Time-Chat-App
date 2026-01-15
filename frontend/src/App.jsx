import { useEffect, useState } from "react";
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
  const [authStep, setAuthStep] = useState("login"); // login | otp
  const [otpPayload, setOtpPayload] = useState(null);

  /* 💬 CHAT */
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");

  /* 🔹 AUTO LOGIN */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  /* 🔌 CONNECT SOCKET AFTER LOGIN */
  useEffect(() => {
    if (!isAuthenticated || !user?.phoneNumber) return;

    socket.connect();
    socket.emit("user_online", user.phoneNumber);

    socket.on("receive_message", (msg) => {
      setChat((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [isAuthenticated, user]);

  /* 📥 LOAD CONVERSATIONS */
  useEffect(() => {
    if (!user?.phoneNumber) return;

    axios
      .get(`http://localhost:5000/conversations/${user.phoneNumber}`)
      .then((res) => setConversations(res.data))
      .catch(console.error);
  }, [user]);

  /* 🔓 LOGOUT */
  const logout = () => {
    localStorage.clear();
    socket.disconnect();
    setUser(null);
    setIsAuthenticated(false);
    setAuthStep("login");
    setSelectedConversation(null);
    setChat([]);
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

  /* 🔓 CHAT UI */
  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Chatify</h3>
          <button onClick={logout}>Logout</button>
        </div>

        <div className="contacts">
          {conversations.length === 0 && (
            <p className="empty-chat">
              Start conversations with your contacts
            </p>
          )}

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

      {/* CHAT WINDOW */}
      <div className="chat-window">
        {!selectedConversation ? (
          <div className="empty-chat">Select a chat</div>
        ) : (
          <>
            <div className="chat-header">
              {
                selectedConversation.participants.find(
                  (p) => p !== user.phoneNumber
                )
              }
            </div>

            <div className="chat-box">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`message ${
                    msg.sender === user.phoneNumber ? "you" : "other"
                  }`}
                >
                  <div>{msg.content}</div>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && message.trim()) {
                    socket.emit("send_message", {
                      conversationId: selectedConversation._id,
                      sender: user.phoneNumber,
                      content: message,
                    });
                    setMessage("");
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
