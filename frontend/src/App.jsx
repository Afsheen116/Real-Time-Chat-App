import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./index.css";

const socket = io("http://localhost:5000");

function App() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });
  }, []);

  const sendMessage = () => {
    if (message.trim() && username.trim()) {
      const msgData = { username, message };
      socket.emit("send_message", msgData);
      setChat((prev) => [...prev, msgData]);
      setMessage("");
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">Real-Time Chat App</div>

      <input
        className="username-input"
        placeholder="Enter your username"
        onChange={(e) => setUsername(e.target.value)}
      />

      <div className="chat-box">
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`message ${
              msg.username === username ? "you" : "other"
            }`}
          >
            <strong>{msg.username}</strong>
            <div>{msg.message}</div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;

