const express = require("express");
const Message = require("../models/message");
const Conversation = require("../models/conversation");

const router = express.Router();

// Get messages for a conversation
router.get("/:conversationId", async (req, res) => {
  const messages = await Message.find({
    conversationId: req.params.conversationId,
  }).sort({ createdAt: 1 });

  res.json(messages);
});

// Save message
router.post("/", async (req, res) => {
  const { conversationId, sender, content } = req.body;

  const message = await Message.create({
    conversationId,
    sender,
    content,
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: content,
  });

  res.json(message);
});

module.exports = router;
