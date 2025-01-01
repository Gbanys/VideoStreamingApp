const { getAllUsersInSpecificChatRoom, createMessage, getAllMessagesFromUsersSorted } = require('./database/database_functions.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Handle connections
io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    const roomId = socket.handshake.query.roomId;

    console.log(`User connected: ${userId} to room: ${roomId}`);

    // Join the specified room
    socket.join(roomId);

    // Notify the room about the new connection
    socket.to(roomId).emit('user-connected', { userId, roomId });

    socket.on('get-all-users-and-messages-from-database', async (data) => {
        try {
            const chat_room_users = await getAllUsersInSpecificChatRoom(data.roomId);
            console.log('Users in chat room:', chat_room_users);
            const list_of_chat_room_user_ids = chat_room_users.map((user) => user.userId);
            const messages = await getAllMessagesFromUsersSorted(list_of_chat_room_user_ids);
            const list_of_usernames = chat_room_users.map((user) => user.username);
            socket.emit('all-users-retrieved', { chat_room_users: list_of_chat_room_user_ids, userId: data.userId, usernames: list_of_usernames });
            socket.emit('receive-chat-messages', { messages: messages });
        } catch (error) {
            console.error('Error fetching users:', error);
            socket.emit('error', {message: 'Failed to retrieve chat room users'});
        }
    });
    // Handle signaling messages within the room
    socket.on('signal', (data) => {
    	if (data.type === 'video-stopped' || data.type === 'video-started') {
            console.log(`${data.type} event for room: ${data.roomId}`);
            socket.to(data.roomId).emit('signal', data);
        }
    	else {
        // Handle other signal types (offer/answer/ice-candidate
            socket.to(data.roomId).emit('signal', data);
        }
    });
    socket.on('send-chat-message', async (data) => {
    	createMessage(data.userId, data.message_text);
        try {
            const messages = await getAllMessagesFromUsersSorted(data.allUserIds);
            console.log(messages);
            socket.emit('receive-chat-messages', { messages });
        } catch (err) {
            console.error('Failed to retrieve messages:', err);
        }
    });
    // Handle disconnections
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId} from room: ${roomId}`);

        // Notify the room about the disconnection
        socket.to(roomId).emit('user-disconnected', { userId, roomId });
    });

});

// Start server on port 3000
server.listen(3000, () => {
    console.log("Server is running on port 3000");
});


