const express = require("express");
const router = express.Router();
const Message = require("../models/message");

/**
 * ✅ Get messages of a conversation
 * GET /messages/:conversationId
 */
router.get("/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
