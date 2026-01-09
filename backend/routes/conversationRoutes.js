const express = require("express");
const Conversation = require("../models/conversation");

const router = express.Router();

// Create or get conversation
router.post("/", async (req, res) => {
  const { user1, user2 } = req.body;

  try {
    let conversation = await Conversation.findOne({
      participants: { $all: [user1, user2] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [user1, user2],
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* 🔹 GET conversations for a user */

module.exports = router;
router.get("/:username", async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.username,
    }).sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
