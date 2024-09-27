// public/js/main.js
const socket = io();
let roomId = null;
let playerIndex = 0;
let gameActive = false;

// DOM Elements
const createGameBtn = document.getElementById('createGame');
const restartGameBtn = document.getElementById('restartGame');
const gameLinkP = document.getElementById('gameLink');
const scoreBoard = document.getElementById('scoreBoard');

// Canvas Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let paddleY = [150, 150];
let ballX = 300, ballY = 200;
let scores = [0, 0];

// Event Listeners
createGameBtn.addEventListener('click', () => {
  socket.emit('createGame');
});

restartGameBtn.addEventListener('click', () => {
  socket.emit('restartGame', roomId);
});

// Handle room creation
socket.on('roomCreated', (id) => {
  roomId = id;
  createGameBtn.style.display = 'none';
  const link = `${window.location.origin}?room=${roomId}`;
  gameLinkP.innerHTML = `Share this link: <a href="${link}">${link}</a>`;
  gameLinkP.style.display = 'block';
  restartGameBtn.style.display = 'block';
  console.log(`Room created with ID: ${roomId}`);
});

// Handle game start
socket.on('startGame', (data) => {
  roomId = data.roomId;
  playerIndex = data.playerIndex; // 0 or 1
  gameActive = true;
  console.log(`Game started in room ${roomId} as player ${playerIndex + 1}`);
});

// Handle room errors
socket.on('roomError', (message) => {
  alert(message);
  console.error(`Room error: ${message}`);
});

// Handle opponent leaving
socket.on('opponentLeft', () => {
  alert('Your opponent has left the game.');
  gameActive = false;
  createGameBtn.style.display = 'block';
  restartGameBtn.style.display = 'none';
  gameLinkP.style.display = 'none';
});

// Handle game updates from server
socket.on('gameUpdate', (data) => {
  paddleY = data.paddleY;
  ballX = data.ballX;
  ballY = data.ballY;
  scores = data.scores;
  drawGame();
});

// Handle game restart
socket.on('restartGame', (newScores) => {
  scores = newScores;
  ballX = 300;
  ballY = 200;
  paddleY = [150, 150];
  drawGame();
  console.log('Game restarted');
});

// Handle URL to join a room
const urlParams = new URLSearchParams(window.location.search);
const joinRoomId = urlParams.get('room');
if (joinRoomId) {
  socket.emit('joinGame', joinRoomId);
}

// Handle mouse movement to control paddle
canvas.addEventListener('mousemove', (event) => {
  if (gameActive) {
    const rect = canvas.getBoundingClientRect();
    let newPaddleY = event.clientY - rect.top - 50; // 50 is half of paddle height (100/2)

    // Clamp the paddle within the canvas
    newPaddleY = Math.max(0, Math.min(newPaddleY, canvas.height - 100));

    // Update local paddle position (optional for smoother movement)
    // paddleY[playerIndex] = newPaddleY;

    // Send the updated paddle position to the server
    socket.emit('paddleMove', { roomId, paddleY: newPaddleY });
  }
});

// Function to draw the game
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw paddles
  ctx.fillStyle = 'white';
  ctx.fillRect(0, paddleY[0], 10, 100); // Left paddle
  ctx.fillRect(canvas.width - 10, paddleY[1], 10, 100); // Right paddle

  // Draw ball
  ctx.beginPath();
  ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
  ctx.fill();

  // Update the score display
  scoreBoard.innerText = `Score: ${scores[0]} - ${scores[1]}`;
}
