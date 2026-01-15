const express = require("express");
const router = express.Router();
const Conversation = require("../models/conversation");

/**
 * ✅ Create or get existing 1-to-1 conversation
 * POST /conversations
 * body: { sender, receiver }
 */
router.post("/", async (req, res) => {
  try {
    const { sender, receiver } = req.body;

    if (!sender || !receiver) {
      return res.status(400).json({ error: "Sender and receiver are required" });
    }

    // 🔑 One conversation per user pair
    let conversation = await Conversation.findOne({
      participants: { $all: [sender, receiver] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [sender, receiver],
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Get all conversations of a user (Sidebar)
 * GET /conversations/:phoneNumber
 */
router.get("/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const conversations = await Conversation.find({
      participants: phoneNumber,
    }).sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
  