
const SocketServer = (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  socket.on("join_room", ({ user_id, room_id }) => {
    try {
      socket.join(room_id);
      socket.room_id = room_id;
      socket.user_id = user_id;
      console.log(`user: ${user_id} has joined room: ${room_id}`);
    } catch (e) {
      console.log("[error]", "join room :", e);
    }
  });
  socket.on("disconnect", () => {
    try {
      socket.leave(socket.room_id);
      console.log(`user: ${socket.user_id} has left room: ${socket.room_id}`);
    } catch (e) {
      console.log("[error]", "left room :", e);
    }
  });
  socket.on("send_message", ({ room_id, sender_id, message, message_id }) => {
    try {
      socket.in(room_id).emit("receive_message", {
        sender_id: sender_id,
        message: message,
        message_id: message_id,
      });
      console.log(`user: ${sender_id} has send a message in room: ${room_id}`);
    } catch (e) {
      console.log("[error]", "send message :", e);
    }
  });
};

module.exports = SocketServer;
