const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

let users = [];

// General namespace
const generalNamespace = io.of('/general');
generalNamespace.on('connection', (socket) => {
    console.log('User connected to /general namespace:', socket.id);

    socket.on('signal', (data) => {
        console.log('Signal received in /general:', data);
        socket.broadcast.emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected from /general namespace:', socket.id);
    });
});

// Room-specific namespace
const roomNamespace = io.of('/room');
roomNamespace.on('connection', (socket) => {
    const roomId = socket.handshake.query.roomId;
    console.log(`User connected to room ${roomId}:`, socket.id);

    // Join the user to the specific room
    socket.join(roomId);

    socket.on('signal', (data) => {
        console.log(`Signal received in room ${roomId}:`, data);
        socket.to(roomId).emit('signal', data); // Broadcast to the same room
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected from room ${roomId}:`, socket.id);
        socket.to(roomId).emit('user-disconnected', socket.id);
        for(let socketId of users){
            socket.broadcast.emit('user-disconnected', socketId);
        }
    });
});

// Start server on port 3000
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
