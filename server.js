const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Handle connections
io.on('connection', socket => {
    console.log('User connected:', socket.id);

    // Forward signaling messages to the other peer
    socket.on('signal', (data) => {
        // Send the message to the other peer
        socket.broadcast.emit('signal', data);
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start server on port 3000
server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
