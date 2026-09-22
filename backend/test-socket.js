import { io } from "socket.io-client";

const socketUrl = 'http://localhost:5000';
console.log('Connecting to', socketUrl);

const socket = io(socketUrl, {
  withCredentials: true,
  extraHeaders: {
    // Mock the cookie to see if it reaches the backend
    Cookie: "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjEwNWM1ZjEwNWM1ZjEwNWM1ZjEwNSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNjkzNTI0NDAwLCJleHAiOjE2OTQxMjk2MDB9.invalid_signature"
  }
});

socket.on('connect', () => {
  console.log('Connected!');
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Socket connect_error:', err.message, err.description);
  process.exit(1);
});
