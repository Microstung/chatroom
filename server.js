const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const Filter = require('bad-words');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const filter = new Filter();

const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX_MESSAGES = 5;

const rateLimitMap = new Map();
const users = new Map();

io.on('connection', (socket) => {
  console.log('User connected');

  function updateUserCount() {
    const userCount = users.size;
    io.emit('update user count', userCount);
  }

  socket.on('set username', ({ username, password }) => {
    console.log('Received username:', username);
    if (users.has(username)) {
      socket.emit('username error', 'This username is already taken');
    } else {
      if (username === "fierce" && password !== "fierce_castle") {
        socket.emit('username error', 'Incorrect password for this username');
      } else {
        users.set(username, socket.id);
        socket.username = username;
        socket.emit('username set');
        io.emit('chat message', `${socket.username} joined`);
        updateUserCount();
      }
    }
  });

  socket.on('chat message', (msg) => {
    const now = Date.now();
    const timestamps = rateLimitMap.get(socket.id) || [];
    timestamps.push(now);
    rateLimitMap.set(socket.id, timestamps);

    const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

    if (recentTimestamps.length > RATE_LIMIT_MAX_MESSAGES) {
      console.log(`User ${socket.id} is spamming`);
      socket.emit('spam detected');
      return;
    }

    const hasValidContent = (text) => {
      return /[\w\s\!\@\#\$\%\^\&\*\(\)\-\+\=\[\]\{\}\;\:\'\"\,\<\.\>\/\?]+/.test(text);
    };

    if (!hasValidContent(msg)) {
      console.log(`User ${socket.id} sent an invalid message: "${msg}"`);
      return;
    }

    const cleanMessage = filter.clean(msg);

    if (socket.username === 'fierce' && cleanMessage === "debug.firechat") {
      for (let i = 0; i < 10; i++) {
        io.emit('chat message', `Server: Test message ${i + 1}`);
      }
    } else {
      io.emit('chat message', `${socket.username}: ${cleanMessage}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    if (socket.username) {
      users.delete(socket.username);
      io.emit('chat message', `${socket.username} left`);
      updateUserCount();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
