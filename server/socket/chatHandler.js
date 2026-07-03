import Message from '../models/Message.js';

export const setupChatHandlers = (io, socket) => {
  socket.on('register_user', (userId) => {
    if (userId) socket.join(userId);
  });

  socket.on('join_direct_chat', ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on('send_direct_message', async (data) => {
    try {
      const { userId, username, text, roomId, avatar } = data;
      
      const newMessage = await Message.create({
        user: userId,
        username,
        text,
        chatRoomId: roomId
      });

      io.to(roomId).emit('receive_direct_message', {
        _id: newMessage._id,
        user: { _id: userId, username, avatar },
        username,
        text,
        chatRoomId: roomId,
        createdAt: newMessage.createdAt
      });

      if (data.recipientId) {
        io.to(data.recipientId).emit('notification_chat', {
          chatRoomId: roomId,
          senderName: username
        });
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });
};
