const socket = io();

const usernameForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatContainer = document.getElementById('chat-container');
const userCount = document.getElementById('user-count');

// Load banned links from banned.txt
const bannedLinks = [];
fetch('/banned.txt')
  .then((response) => response.text())
  .then((data) => {
    bannedLinks.push(...data.split('\n').map(link => link.trim()));
  });

usernameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value;
  if (username === "fierce") {
    const password = prompt("Enter the password:");
    socket.emit('set username', { username, password });
  } else {
    socket.emit('set username', { username });
  }
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
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  // Block HTML tags and attributes
  const sanitizedMessage = sanitizeHTML(msg);

  // Match URLs and format them as links
  sanitizedMessage = sanitizedMessage.replace(/\b(https?:\/\/\S+)\b/g, (url) => {
    if (bannedLinks.some(banned => url.includes(banned))) {
      // Banned link, show alert and do not format as a link
      return `<span style="color: red; text-decoration: underline; cursor: pointer;" onclick="alert('That link is banned.')">${url}</span>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: yellow; text-decoration: underline;">${url}</a>`;
  });

  messageElement.innerHTML = sanitizedMessage;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value;

  // Block HTML tags and attributes
  const sanitizedMessage = sanitizeHTML(message);

  socket.emit('chat message', sanitizedMessage);
  messageInput.value = '';
});

// Function to sanitize HTML input
function sanitizeHTML(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}
