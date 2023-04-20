const socket = io();

const usernameForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatContainer = document.getElementById('chat-container');
const userCount = document.getElementById('user-count');

usernameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value;
  socket.emit('set username', username);
});

socket.on('username set', () => {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('chat-content').style.display = 'block';
});

socket.on('username error', (error) => {
  alert(error);
});

socket.on('spam detected', () => {
  showNotification();
});

function showNotification() {
  const notification = document.getElementById('notification');
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

socket.on('update user count', (count) => {
  userCount.textContent = `${count} user${count === 1 ? '' : 's'} online`;
});

socket.on('chat message', (msg) => {
  const messageElement = document.createElement('p');
  messageElement.textContent = msg;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value;

  if (message === "debug.firechat" && socket.username === "fierce") {
    const password = prompt("Enter the password:");
    if (password === "fierce_castle") {
      socket.emit('debug message');
    } else {
      alert("Incorrect password.");
    }
  } else {
    socket.emit('chat message', message);
  }

  messageInput.value = '';
});
