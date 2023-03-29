const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const conversationSchema = new Schema({
  name: {
    type: String,
    required: false,
  },
  created: {
    type: Number,
    default: Date.now() / 1000,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  messages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
    },
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "messages",
  },
  senderLastCheckTime: {
    type: Number,
    default: Date.now() / 1000,
  },
  receiverLastCheckTime: {
    type: Number,
    default: 0,
  },
});
module.exports = mongoose.model("conversations", conversationSchema);
