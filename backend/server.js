require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
connectDB();

const Message = require("./models/message");
const Conversation = require("./models/conversation");

const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
app.use(cors());
app.use(express.json());

/* 🔹 API Routes */
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);

const server = http.createServer(app);

/* 🔹 Socket Setup */
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* 🟢 User online */
  socket.on("user_online", (username) => {
    socket.username = username;

    if (!onlineUsers.includes(username)) {
      onlineUsers.push(username);
    }

    io.emit("online_users", onlineUsers);
  });

  /* 💬 Send Message (Conversation-based) */
  socket.on("send_message", async (data) => {
    try {
      const { conversationId, sender, content } = data;

      if (!conversationId || !sender || !content) {
        return;
      }

      const message = await Message.create({
        conversationId,
        sender,
        content,
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: content,
      });

      // Emit message ONLY to this conversation
      io.emit("receive_message", message);
    } catch (err) {
      console.error("Error saving message:", err.message);
    }
  });

  /* ✍️ Typing */
  socket.on("typing", (username) => {
    socket.broadcast.emit("user_typing", username);
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stop_typing");
  });

  /* 🔴 Disconnect */
  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers = onlineUsers.filter(
        (user) => user !== socket.username
      );
      io.emit("online_users", onlineUsers);
    }

    socket.broadcast.emit("user_stop_typing");
    console.log("User disconnected:", socket.id);
  });
});

/* 🚀 Server Start */
server.listen(5000, () => {
  console.log("Server running on port 5000");
});
