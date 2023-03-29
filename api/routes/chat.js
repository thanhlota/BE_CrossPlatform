const express = require("express");
const router = express.Router();
const verify = require("../utils/verifyToken");
const conversation = require("../models/Conversation");
const user = require("../models/User");
const message = require("../models/Message");
const { setAndSendResponse, responseError } = require("../response/error");
const { response } = require("express");
var multer = require("multer");
const { bucket } = require("./firebase");
///fdf
router.post("/get_list_conversation", verify, async (req, res) => {
  let { index, count } = req.query;
  if (index === undefined)
    setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  if (count === undefined)
    setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  if (typeof index != "string")
    setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
  if (typeof count != "string")
    setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
  let isNumIndex = /^\d+$/.test(index);
  if (!isNumIndex) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  let isNumCount = /^\d+$/.test(count);
  if (!isNumCount) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  index = parseInt(index);
  count = parseInt(count);
  if (index < 0) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  if (count < 0) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  const user_id = req.user.id;
  // console.log(user_id);
  const conversation_list = await conversation
    .find({
      $or: [
        {
          sender: user_id,
        },
        {
          receiver: user_id,
        },
      ],
    })
    .sort("-created")
    .skip(index)
    .limit(count)
    .populate("sender")
    .populate("receiver")
    .populate("lastMessage");
  let numNewMessage = 0;
  const data = await Promise.all(
    conversation_list.map(async (conversation) => {
      let unread = 0;
      let pt;
      if (conversation.receiver._id.equals(user_id)) {
        pt = await user.findOne({ _id: conversation.sender._id });
      } else pt = await user.findOne({ _id: conversation.receiver._id });
      const partner = {
        id: pt._id,
        username: pt.name,
        avatar: pt.avatar,
      };
      if (conversation.lastMessage) {
        if (
          (conversation.receiver.id === user_id &&
            conversation.lastMessage.modified >
              conversation.receiverLastCheckTime) ||
          (conversation.sender.id === user_id &&
            conversation.lastMessage.modified >
              conversation.senderLastCheckTime)
        ) {
          numNewMessage += 1;
          unread = 1;
        }
        return {
          id: conversation._id,
          partner: partner,
          lastMessage: {
            message: conversation.lastMessage,
            unread: unread,
          },
        };
      } else
        return {
          id: conversation._id,
          partner: partner,
          lastMessage: {
            message: {
              created: 0,
            },
            unread: 0,
          },
        };
    })
  );
  // console.log(data);
  res.status(200).send({
    code: "1000",
    message: "OK",
    data: data,
    numNewMessage: numNewMessage,
  });
});
router.post("/get_conversation", verify, async (req, res) => {
  let { conversation_id, index, count } = req.query;
  if (index === undefined)
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  if (count === undefined)
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  if (conversation_id === undefined)
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  if (typeof index != "string")
    return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
  if (typeof count != "string")
    return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
  if (typeof conversation_id != "string")
    return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
  let isNumIndex = /^\d+$/.test(index);
  if (!isNumIndex) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  let isNumCount = /^\d+$/.test(count);
  if (!isNumCount) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  index = parseInt(index);
  count = parseInt(count);
  if (index < 0) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  if (count < 0) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  const user_id = req.user.id;
  let detail_conversation = await conversation
    .findOne({ _id: conversation_id })
    .populate({
      path: "messages",
      options: { sort: ["-modified"], populate: { path: "author" } },
    })
    .populate("lastMessage");
  // console.log(detail_conversation);//
  if (!detail_conversation) {
    return setAndSendResponse(res, responseError.CONVERSATION_IS_NOT_EXISTED);
  }
  const lastCheckTime = Date.now() / 1000;
  var partner_id;
  if (detail_conversation.receiver.equals(user_id)) {
    detail_conversation.receiverLastCheckTime = lastCheckTime;
    partner_id = detail_conversation.sender;
  } else {
    detail_conversation.senderLastCheckTime = lastCheckTime;
    partner_id = detail_conversation.receiver;
  }
  await detail_conversation.save((err, res) => {
    if (err) {
      return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
  });
  const message_list = [];
  let last_index = Math.min(detail_conversation.messages.length, index + count);
  for (let i = index; i < last_index; i++)
    message_list.push(detail_conversation.messages[i]);
  let cv = message_list.map((message) => ({
    id: message._id,
    content: message.content,
    image: message.image,
    video: message.video,
    author: {
      id: message.author._id,
      username: message.author.name,
      avatar: message.author.avatar,
    },
  }));
  // partner_id: item.partner.id,
  // username: item.partner.username,
  // conversation_id: item.id,
  // avatar: item.partner.avatar,
  let data = {};
  data.conversation = cv;
  data.id = conversation_id;
  const partner = await user.findOne({ _id: partner_id });
  data.partner = {
    id: partner_id,
    username: partner.name,
    avatar: partner.avatar,
  };
  res.status(200).send({
    code: "1000",
    message: "OK",
    data: data,
  });
});
router.post("/create_conversation", verify, async (req, res) => {
  let { sender, receiver } = req.query;
  sender = JSON.parse(sender);
  receiver = JSON.parse(receiver);
  if (sender === undefined)
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  if (receiver === undefined)
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  const sendUser = await user.find({ _id: sender.id });
  if (!sendUser)
    return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
  const receiveUser = await user.find({ _id: receiver.id });
  if (!receiveUser)
    return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
  const isRepeat = await conversation.find({
    $or: [
      {
        $and: [
          {
            sender: sender.id,
          },
          {
            receiver: receiver.id,
          },
        ],
      },
      {
        $and: [
          {
            sender: receiver.id,
          },
          {
            receiver: sender.id,
          },
        ],
      },
    ],
  });
  if (isRepeat.length) {
    return setAndSendResponse(res, responseError.CONVERSATION_IS_EXISTED);
  }
  const savedConversation = new conversation({
    name: null,
    sender: sender.id,
    receiver: receiver.id,
  });
  await savedConversation.save((err, res) => {
    if (err) {
      return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
  });
  res.status(200).send({
    code: "1000",
    message: "OK",
    data: savedConversation,
  });
});
async function deleteRemoteFile(filename) {
  await bucket.file(filename).delete();
}
router.post("/delete_conversation", verify, async (req, res) => {
  const { conversation_id } = req.query;
  if (!conversation_id) {
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  }
  const user_id = req.user.id;
  const user_delete_conversation = await user.findOne({ _id: user_id });
  if (!user_delete_conversation) {
    return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
  }
  const delete_conversation = await conversation
    .findOne({
      _id: conversation_id,
    })
    .populate("messages");
  if (!delete_conversation) {
    return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
  }
  if (
    !user_delete_conversation._id.equals(delete_conversation.receiver) &&
    !user_delete_conversation._id.equals(delete_conversation.sender)
  ) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  delete_conversation.messages.forEach((message) => {
    if (message.image.length) {
      for (let image of message.image) {
        try {
          deleteRemoteFile(image.filename);
        } catch (err) {
          console.log("Khong xoa duoc anh");
          return setAndSendResponse(res, responseError.EXCEPTION_ERROR);
        }
      }
    }
    if (message.video.url) {
      try {
        deleteRemoteFile(message.video.filename);
      } catch (err) {
        console.log("Khong xoa duoc video");
        return setAndSendResponse(res, responseError.EXCEPTION_ERROR);
      }
    }
    message.deleteOne({ _id: message.id }, (err, res) => {
      if (err) {
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
      }
    });
  });
  await conversation.deleteOne({ _id: conversation_id }, (err, res) => {
    if (err) {
      return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
  });
  res.status(200).send({
    code: "1000",
    message: "OK",
    data: delete_conversation,
  });
});
// Initiating a memory storage engine to store files as Buffer objects
const uploader = multer({
  storage: multer.memoryStorage(),
});
function uploadFile(file) {
  const newNameFile = new Date().toISOString() + file.originalname;
  const blob = bucket.file(newNameFile);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });
  console.log(bucket.name);
  console.log(blob.name);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
    bucket.name
  }/o/${encodeURI(blob.name)}?alt=media`;
  return new Promise((resolve, reject) => {
    blobStream.on("error", function (err) {
      reject(err);
    });

    blobStream.on("finish", () => {
      resolve({
        filename: newNameFile,
        url: publicUrl,
      });
    });

    blobStream.end(file.buffer);
  });
}
var cpUpload = uploader.fields([{ name: "image" }, { name: "video" }]);
router.post("/add_message", cpUpload, verify, async (req, res) => {
  const { content, conversation_id } = req.query;
  if (!conversation_id) {
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  }
  const user_id = req.user.id;
  const modified_conversation = await conversation.findOne({
    _id: conversation_id,
  });
  if (!modified_conversation) {
    return setAndSendResponse(res, responseError.CONVERSATION_IS_NOT_EXISTED);
  }
  if (
    !modified_conversation.sender.equals(user_id) &&
    !modified_conversation.receiver.equals(user_id)
  ) {
    return setAndSendResponse(res, responseError.NOT_ACCESS);
  }
  var image, video;
  console.log(req.files);
  if (req.files) {
    image = req.files.image;
    video = req.files.video;
  }
  if (!content && !image && !video) {
    console.log("Không có content, image, video");
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  }

  // PARAMETER_TYPE_IS_INVALID
  if (content && typeof content !== "string") {
    console.log("PARAMETER_TYPE_IS_INVALID");
    return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
  }
  if (image && video) {
    console.log("Have image and video");
    return setAndSendResponse(res, responseError.UPLOAD_FILE_FAILED);
  }

  const savedMessage = new message({
    author: user_id,
    content: content,
  });
  if (image) {
    console.log("image length", image.length);
    for (const item_image of image) {
      const filetypes = /jpeg|jpg|png/;
      const mimetype = filetypes.test(item_image.mimetype);
      // PARAMETER_TYPE_IS_INVALID
      if (!mimetype) {
        console.log("Mimetype image is invalid");
        return setAndSendResponse(
          res,
          responseError.PARAMETER_VALUE_IS_INVALID
        );
      }
    }
    promises = image.map((item_image) => {
      return uploadFile(item_image);
    });
    try {
      const file = await Promise.all(promises);
      savedMessage.image = file;
    } catch (err) {
      console.error(err);
      console.log("UPLOAD_FILE_FAILED");
      return setAndSendResponse(res, responseError.UPLOAD_FILE_FAILED);
    }
  }
  if (video) {
    for (const item_video of video) {
      const filetypes = /mp4/;
      const mimetype = filetypes.test(item_video.mimetype);
      if (!mimetype) {
        console.log("Mimetype video is invalid");
        return setAndSendResponse(
          res,
          responseError.PARAMETER_VALUE_IS_INVALID
        );
      }
    }
    promises = req.files.video.map((video) => {
      return uploadFile(video);
    });
    try {
      const file = await Promise.all(promises);
      savedMessage.video = file[0];
    } catch (err) {
      console.log("UPLOAD_FILE_FAILED");
      return setAndSendResponse(res, responseError.UPLOAD_FILE_FAILED);
    }
  }
  await savedMessage.save().catch((err) => {
    console.log(err);
    return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
  });
  console.log(savedMessage);
  modified_conversation.messages.push(savedMessage._id);
  modified_conversation.lastMessage = savedMessage._id;
  await modified_conversation.save().catch((err) => {
    console.log(err);
    return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
  });
  res.status(200).send({
    code: "1000",
    message: "OK",
    data: savedMessage,
  });
});
router.post("/delete_message", verify, async (req, res) => {
  const { conversation_id, message_id } = req.query;
  if (!message_id) {
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  }
  if (!conversation_id) {
    return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
  }
  const delete_message = await message.findOne(
    { _id: message_id },
    (err, res) => {
      if (err) {
        console.log(err);
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
      }
    }
  );
  if (!delete_message) {
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  let modified_conversation = await conversation.findOne(
    { _id: conversation_id },
    (err, res) => {
      if (err) {
        console.log(err);
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
      }
    }
  );
  const user_id = req.user.id;
  if (!delete_message.author.equals(user_id)) {
    return setAndSendResponse(res, responseError.NOT_ACCESS);
  }
  if (!delete_message) {
    console.log("message is not existed");
    return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
  }
  if (delete_message.image.length) {
    for (let image of delete_message.image) {
      try {
        await deleteRemoteFile(image.filename);
      } catch (err) {
        console.log("Khong xoa duoc anh");
        return setAndSendResponse(res, responseError.EXCEPTION_ERROR);
      }
    }
  }
  if (delete_message.video.url) {
    try {
      await deleteRemoteFile(delete_message.video.filename);
    } catch (err) {
      console.log("Khong xoa duoc video");
      return setAndSendResponse(res, responseError.EXCEPTION_ERROR);
    }
  }
  await message.deleteOne({ _id: message_id }, (err, res) => {
    if (err) {
      return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
  });
  if (
    modified_conversation.lastMessage &&
    modified_conversation.lastMessage.equals(message_id)
  ) {
    let n = modified_conversation.messages.length;
    if (n > 1) {
      modified_conversation.lastMessage =
        modified_conversation.messages[length - 2].id;
    } else modified_conversation.lastMessage = null;
  }
  modified_conversation.messages = modified_conversation.messages.filter(
    (message) => {
      return !message.equals(message_id);
    }
  );
  await modified_conversation.save((err, res) => {
    if (err) {
      return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
  });
  res.status(200).send({
    code: "1000",
    message: "OK",
    data: delete_message,
  });
});

module.exports = router;
