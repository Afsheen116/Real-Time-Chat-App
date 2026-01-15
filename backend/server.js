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

/* 🔹 App init */
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

  /* 🟢 User online (identity = phoneNumber) */
  socket.on("user_online", (phoneNumber) => {
    socket.phoneNumber = phoneNumber;

    if (!onlineUsers.includes(phoneNumber)) {
      onlineUsers.push(phoneNumber);
    }

    io.emit("online_users", onlineUsers);
  });

  /* 🔗 Join conversation room */
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  /* 💬 Send message (AUTO CREATE CONVERSATION) */
  socket.on("send_message", async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) return;

      let conversation = await Conversation.findOne({
        participants: { $all: [sender, receiver] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [sender, receiver],
        });
      }

      const message = await Message.create({
        conversationId: conversation._id,
        sender,
        content,
      });

      conversation.lastMessage = content;
      await conversation.save();

      io.to(conversation._id.toString()).emit(
        "receive_message",
        message
      );
      io.emit("conversation_updated", conversation);

    } catch (err) {
      console.error("Error sending message:", err.message);
    }
  });

  /* 🔴 Disconnect */
  socket.on("disconnect", () => {
    if (socket.phoneNumber) {
      onlineUsers = onlineUsers.filter(
        (u) => u !== socket.phoneNumber
      );
      io.emit("online_users", onlineUsers);
    }

    console.log("User disconnected:", socket.id);
  });
});

/* 🔹 Start server */
server.listen(5000, () => {
  console.log("Server running on port 5000");
});
