require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
connectDB();

/* 🔹 Models */
const Message = require("./models/message");
const Conversation = require("./models/conversation");

/* 🔹 Routes */
const authRoutes = require("./routes/authRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");

/* 🔹 App init (MUST COME FIRST) */
const app = express();
app.use(cors());
app.use(express.json());

/* 🔹 API Routes */
app.use("/auth", authRoutes);
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);

/* 🔹 Server + Socket */
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* 🟢 User online */
  socket.on("user_online", (username) => {
    socket.username = username;
    if (!onlineUsers.includes(username)) onlineUsers.push(username);
    io.emit("online_users", onlineUsers);
  });

  /* 🔗 Join conversation */
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  /* 💬 Send message */
  socket.on("send_message", async ({ conversationId, sender, content }) => {
    if (!conversationId || !sender || !content) return;

    const message = await Message.create({
      conversationId,
      sender,
      content,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content,
    });

    io.to(conversationId).emit("receive_message", message);
  });

  /* 🔴 Disconnect */
  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers = onlineUsers.filter((u) => u !== socket.username);
      io.emit("online_users", onlineUsers);
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
