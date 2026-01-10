const express = require("express");
const router = express.Router();
const Conversation = require("../models/conversation");

/**
 * ✅ Create or get existing conversation (1-to-1)
 * POST /conversations
 * body: { user1, user2 }
 */
router.post("/", async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    if (!user1 || !user2) {
      return res.status(400).json({ error: "Both users are required" });
    }

    // 🔑 Ensure consistent order to prevent duplicates
    const participants = [user1, user2].sort();

    let conversation = await Conversation.findOne({
      participants,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Get all conversations of a user (Sidebar)
 * GET /conversations/:username
 */
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

module.exports = router;
