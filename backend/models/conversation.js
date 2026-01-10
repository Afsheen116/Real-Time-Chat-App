const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [String], // usernames
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length >= 2;
        },
        message: "A conversation must have at least 2 participants",
      },
    },
    lastMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// 🚀 Prevent duplicate 1-to-1 conversations
conversationSchema.index(
  { participants: 1 },
  { unique: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);

