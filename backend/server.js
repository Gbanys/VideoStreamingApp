const { getAllUsersInSpecificChatRoom, createMessage, getAllMessagesFromUsersSorted } = require('./database/database_functions.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const {checkRoomWithPasswordAndUser, getUsernameByUserId} = require("./database/database_functions");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Handle connections
io.on('connection', async (socket) => {
    const userId = socket.handshake.query.userId;
    const roomId = socket.handshake.query.roomId;
    const roomPassword = socket.handshake.query.roomPassword;

    let recordExists = await checkRoomWithPasswordAndUser(roomId, roomPassword, userId);
    if(recordExists){
        socket.join(roomId);
        console.log(`User connected: ${userId} to room: ${roomId}`);
        let query_result = await getUsernameByUserId(userId);
        let username = query_result[0].username;
        socket.emit('validation-message', { isValidated: true, username: username});
        socket.to(roomId).emit('user-connected', { userId, roomId });
    }
    else{
        socket.emit('validation-message', { isValidated: false });
    }

    socket.on('get-all-users-and-messages-from-database', async (data) => {
        try {
            const chat_room_users = await getAllUsersInSpecificChatRoom(data.roomId);
            console.log('Users in chat room:', chat_room_users);
            const list_of_chat_room_user_ids = chat_room_users.map((user) => user.userId);
            const messages = await getAllMessagesFromUsersSorted(list_of_chat_room_user_ids);
            const list_of_usernames = chat_room_users.map((user) => user.username);
            socket.emit('all-users-retrieved', { chat_room_users: list_of_chat_room_user_ids, userId: data.userId, usernames: list_of_usernames, messages });
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
    socket.on('send-emoji', (data) => {
       socket.to(data.roomId).emit('receive-emoji', data);
    });
    socket.on('send-chat-message', async (data) => {
    	createMessage(data.userId, data.message_text);
        try {
            const messages = await getAllMessagesFromUsersSorted(data.allUserIds);
            console.log("Chat room messages:", messages);
            socket.to(data.roomId).emit('receive-chat-messages', { messages });
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


