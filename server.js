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
    let userId = socket.handshake.query.queryId;
    console.log('User connected:', userId);

    // Forward signaling messages to the other peer
    socket.on('signal', (data) => {
        // Send the message to the other peer
        socket.broadcast.emit('signal', data);
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('User disconnected:', userId);
        socket.emit('disconnect', userId)
    });
});

// Start server on port 3000
server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
