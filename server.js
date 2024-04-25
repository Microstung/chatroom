const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const Filter = require('bad-words');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');

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

// Load banned links from banned.txt
const bannedLinks = [];
fs.readFile('banned.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading banned.txt:', err);
  } else {
    bannedLinks.push(...data.split('\n').map(link => link.trim()));
  }
});

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
      if (username === 'fierce' && password !== 'fierce_castle') {
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
      return /[\w\s\!\@\#\$\%\^\&\*\(\)\-\+\=\[\]\{\}\;\:\'\"\,\\.\>\/\?]+/.test(text);
    };

    if (!hasValidContent(msg)) {
      console.log(`User ${socket.id} sent an invalid message: "${msg}"`);
      return;
    }

    // Sanitize the message to remove any potentially harmful content
    const cleanMessage = sanitizeHtml(msg, {
      allowedTags: [], // Allow no HTML tags
      allowedAttributes: {}, // Allow no attributes
    });

    // Check if the message contains banned links
    if (bannedLinks.some(banned => cleanMessage.includes(banned))) {
      // Notify the sender about the banned link
      socket.emit('chat message', 'Your message contains a banned link.');
      return;
    }

    // Check if user is 'fierce' and the message is 'DEBUG.FIRECHAT'
    if (socket.username === 'fierce' && cleanMessage === 'DEBUG.FIRECHAT') {
      for (let i = 0; i < 100; i++) {
        io.emit('chat message', 'chat test');
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
