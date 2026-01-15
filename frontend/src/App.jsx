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
  const [selectedUser, setSelectedUser] = useState(null); // phoneNumber
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [newChatNumber, setNewChatNumber] = useState("");
  const startNewChat = async () => {
    if (!newChatNumber || newChatNumber === user.phoneNumber) {
      return alert("Enter a valid phone number");
    }

    try {
      const res = await axios.post("http://localhost:5000/conversations", {
        user1: user.phoneNumber,
        user2: newChatNumber,
      });

      setConversations((prev) => {
        const exists = prev.find((c) => c._id === res.data._id);
        return exists ? prev : [res.data, ...prev];
      });

      setSelectedConversation(res.data);
      socket.emit("join_conversation", res.data._id);
      setChat([]);
      setNewChatNumber("");
    } catch (err) {
      alert("Could not start chat");
    }
  };


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
  useEffect(() => {
    socket.on("conversation_updated", (updatedConv) => {
      setConversations((prev) => {
        const filtered = prev.filter(
          (c) => c._id !== updatedConv._id
        );
        return [updatedConv, ...filtered];
      });
    });

    return () => socket.off("conversation_updated");
  }, []);


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
    setSelectedUser(null);
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

  /* 💬 SEND MESSAGE */
  const sendMessage = () => {
    if (!message.trim() || !selectedUser) return;

    socket.emit("send_message", {
      sender: user.phoneNumber,
      receiver: selectedUser,
      content: message,
    });

    setMessage("");
  };

  /* 🔓 CHAT UI */
  return (
    <div className="app-container">
      {/* 🔹 SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Chatify</h3>
          <button onClick={logout}>Logout</button>
        </div>
        <div className="new-chat">
          <input
            placeholder="Enter phone number"
            value={newChatNumber}
            onChange={(e) => setNewChatNumber(e.target.value)}
          />
          <button onClick={startNewChat}>Start Chat</button>
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
                onClick={() => {
                  setSelectedUser(otherUser);
                  setChat([]); // messages will arrive via socket
                }}
              >
                <strong>{otherUser}</strong>
                <p>{c.lastMessage || "Tap to chat"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🔹 CHAT WINDOW */}
      <div className="chat-window">
        {!selectedUser ? (
          <div className="empty-chat">Select a chat</div>
        ) : (
          <>
            <div className="chat-header">{selectedUser}</div>

            <div className="chat-box">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`message ${msg.sender === user.phoneNumber ? "you" : "other"
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
                  if (e.key === "Enter") sendMessage();
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

