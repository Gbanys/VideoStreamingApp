const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(3000, {
  cors: {
    origin: '*',
  },
});

const users = {};

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  console.log('User connected:', userId);
  socket.on('join-room', () => {
    users[userId] = socket;
    console.log('User joined room:', userId);
    socket.broadcast.emit('user-connected', userId);
    socket.emit('user-connected', userId);
  });
  socket.on('get-chat-users', () => {
    socketIds = [];
    for(let socketId of Object.keys(users)){
      socketIds.push(socketId);
    }
    socket.emit('get-chat-users', socketIds);
  });
  socket.on('signal', ({ target, message }) => {
    if (users[target]) {
      users[target].emit('signal', { sender: userId, message });
    }
  });
  socket.on('disconnect', () => {
    delete users[userId];
    console.log('User disconnected:', userId);
    socket.broadcast.emit('user-disconnected', userId);
  });
});
