import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./index.css";
import axios from "axios";


const socket = io("http://localhost:5000");

function App() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [theme, setTheme] = useState("light");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef(null);

  // 🌙 Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // 💬 Receive messages
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  // 🟢 Online users
  useEffect(() => {
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    return () => socket.off("online_users");
  }, []);
  useEffect(() => {
  axios
    .get("http://localhost:5000/messages")
    .then((res) => {
      setChat(res.data);
    })
    .catch((err) => {
      console.error("Failed to load messages:", err);
    });
}, []);

  // ✍️ Typing indicator
  useEffect(() => {
    socket.on("user_typing", (username) => {
      setTypingUser(username);
    });

    socket.on("user_stop_typing", () => {
      setTypingUser("");
    });
    


    return () => {
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
const sendMessage = () => {
  if (message.trim() && username.trim()) {
    const msgData = {
      sender: username,
      receiver: "Global", // for now
      content: message,
    };

    socket.emit("send_message", msgData);
    socket.emit("stop_typing");
    setMessage("");
  }
};


  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <span>Chatify</span>
        <button className="toggle-btn" onClick={toggleTheme}>
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      {/* Online Users */}
      <div className="online-users">
        🟢 Online: {onlineUsers.join(", ")}
      </div>

      {/* Username */}
      <input
        className="username-input"
        placeholder="Enter your username"
        onChange={(e) => setUsername(e.target.value)}
        onBlur={() => {
          if (username.trim()) {
            socket.emit("user_online", username);
          }
        }}
      />
{/* Chat Messages */}
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



      {/* Typing Indicator */}
      {typingUser && typingUser !== username && (
        <div style={{ fontSize: "13px", padding: "4px 14px", opacity: 0.7 }}>
          ✍️ {typingUser} is typing...
        </div>
      )}

      {/* Input */}
   <div className="chat-input">
  <input
    placeholder="Type a message..."
    value={message}
    onChange={(e) => {
      setMessage(e.target.value);

      if (!username.trim()) return;

      // Emit typing event
      socket.emit("typing", username);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout (1 second)
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing");
      }, 1000);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        sendMessage();
        socket.emit("stop_typing");

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }}
  />
  <button
    onClick={() => {
      sendMessage();
      socket.emit("stop_typing");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }}
  >
    Send
  </button>
</div>
    </div>
  );
}

export default App;
