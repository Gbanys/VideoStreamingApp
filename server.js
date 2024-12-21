const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('signal', (data) => {
    const { target, message } = data;
    io.to(target).emit('signal', { sender: socket.id, message });
  });

  socket.on('disconnect', () => {
    io.emit('user-disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Signaling server running on port 3000');
});
