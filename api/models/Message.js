const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const opts = {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: {
    currentTime: () => Math.floor(Date.now() / 1000),
    createdAt: "created",
    updatedAt: "modified",
  },
};
const messageSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    content: {
      type: String,
      required: false,
    },
    image: [
      {
        filename: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    ],
    video: {
      filename: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    created: Number,
    modified: Number,
  },
  opts
);
module.exports = mongoose.model("messages", messageSchema);
