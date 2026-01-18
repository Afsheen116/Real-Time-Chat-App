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

  /* 🟢 User online */
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
    console.log(`Socket ${socket.id} joined room ${conversationId}`);
  });
  socket.on("message_seen", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message || message.status === "seen") return;

      message.status = "seen";
      await message.save();

      io.to(message.conversationId.toString()).emit(
        "message_status_update",
        {
          messageId: message._id,
          status: "seen",
        }
      );
    } catch (err) {
      console.error("Seen update error:", err.message);
    }
  });



  /* ✍️ Typing */
  socket.on("typing", ({ conversationId, user }) => {
    socket.to(conversationId).emit("user_typing", user);
  });

  socket.on("stop_typing", (conversationId) => {
    socket.to(conversationId).emit("user_stop_typing");
  });

  /* 💬 Send message */
  socket.on("send_message", async ({ conversationId, sender, content }) => {
    try {
      if (!conversationId || !sender || !content) return;

      const message = await Message.create({
        conversationId,
        sender,
        content,
        status: "sent",
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: content,
        updatedAt: new Date(),
      });

      // ✅ Emit to ALL users in room (sender + receiver)
      io.to(conversationId).emit("receive_message", message);
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

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
