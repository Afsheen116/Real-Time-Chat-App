import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./index.css";

const socket = io("http://localhost:5000");

function App() {
  const [username, setUsername] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [theme, setTheme] = useState("light");
  const typingTimeoutRef = useRef(null);

  /* 🌙 Theme */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /* 🟢 Online users */
  useEffect(() => {
    socket.on("online_users", (users) => setOnlineUsers(users));
    return () => socket.off("online_users");
  }, []);

  /* 💬 Receive message (ROOM BASED) */
  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setChat((prev) => [...prev, msg]);
    });
    return () => socket.off("receive_message");
  }, []);

  /* ✍️ Typing */
  useEffect(() => {
    socket.on("user_typing", setTypingUser);
    socket.on("user_stop_typing", () => setTypingUser(""));
    return () => {
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, []);

  /* 🔹 Load conversations when username is set */
  useEffect(() => {
    if (!username) return;

    axios
      .get(`http://localhost:5000/conversations/${username}`)
      .then((res) => setConversations(res.data))
      .catch(console.error);
  }, [username]);

  /* 🔹 Open chat (JOIN ROOM + LOAD MESSAGES) */
  const openChat = async (conversation) => {
    setSelectedConversation(conversation);
    socket.emit("join_conversation", conversation._id);

    const res = await axios.get(
      `http://localhost:5000/messages/${conversation._id}`
    );
    setChat(res.data);
  };

  /* 🔹 Send message */
  const sendMessage = () => {
    if (!message.trim() || !selectedConversation) return;

    socket.emit("send_message", {
      conversationId: selectedConversation._id,
      sender: username,
      content: message,
    });

    setMessage("");
    socket.emit("stop_typing");
  };

  return (
    <div className="app-container">

      {/* 🔹 SIDEBAR */}
      <div className={`sidebar ${selectedConversation ? "hide-mobile" : ""}`}>
        <div className="sidebar-header">
          <h3>Chatify</h3>
        </div>

        <input
          className="username-input"
          placeholder="Enter your username"
          onBlur={(e) => {
            setUsername(e.target.value);
            socket.emit("user_online", e.target.value);
          }}
        />

        <div className="contacts">
          {conversations.map((c) => {
            const otherUser = c.participants.find(
              (p) => p !== username
            );

            return (
              <div
                key={c._id}
                className="contact"
                onClick={() => openChat(c)}
              >
                <strong>{otherUser}</strong>
                <p>{c.lastMessage || "Tap to chat"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🔹 CHAT WINDOW */}
      <div className={`chat-window ${!selectedConversation ? "hide-mobile" : ""}`}>

        <div className="chat-header">
          <button className="back-btn" onClick={() => setSelectedConversation(null)}>
            ←
          </button>
          <span>
            {selectedConversation
              ? selectedConversation.participants.find((p) => p !== username)
              : "Select chat"}
          </span>
          <button className="toggle-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        {!selectedConversation ? (
          <div className="empty-chat">Select a chat to start messaging</div>
        ) : (
          <>
            <div className="chat-box">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`message ${
                    msg.sender === username ? "you" : "other"
                  }`}
                >
                  <strong>{msg.sender}</strong>
                  <div>{msg.content}</div>
                </div>
              ))}
            </div>

            {typingUser && typingUser !== username && (
              <div className="typing-indicator">
                ✍️ {typingUser} is typing...
              </div>
            )}

            <div className="chat-input">
              <input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  socket.emit("typing", username);
                }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

