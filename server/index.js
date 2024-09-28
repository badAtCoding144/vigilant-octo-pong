// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html on the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

let rooms = {}; // Object to keep track of active rooms and players

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createGame', () => {
    const roomId = Math.random().toString(36).substr(2, 9); // Generate a random room ID
    rooms[roomId] = {
      players: [socket.id],
      paddles: [150, 150],
      scores: [0, 0],
      ball: { x: 300, y: 200, speedX: 5, speedY: 5 },
      interval: null
    };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    console.log(`Game created with room ID: ${roomId}`);
  });

  socket.on('joinGame', (roomId) => {
    const room = rooms[roomId];
    if (room && room.players.length < 2) {
      socket.join(roomId);
      room.players.push(socket.id);
      io.to(roomId).emit('startGame', { roomId, playerIndex: room.players.indexOf(socket.id) });
      console.log(`Player ${socket.id} joined room ${roomId}`);

      // Start the game loop when two players have joined
      if (room.players.length === 2) {
        room.interval = setInterval(() => {
          updateGame(roomId);
        }, 1000 / 60); // 60 FPS
      }
    } else {
      socket.emit('roomError', 'Room is full or does not exist');
      console.log(`Failed to join room ${roomId}: Room is full or does not exist`);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Clean up rooms when players disconnect
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter(id => id !== socket.id);
        if (room.players.length === 0) {
          clearInterval(room.interval);
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted as it's empty`);
        } else {
          // Inform the remaining player that the opponent has left
          io.to(roomId).emit('opponentLeft');
          clearInterval(room.interval);
        }
      }
    }
  });

  socket.on('paddleMove', ({ roomId, paddleY }) => {
    const room = rooms[roomId];
    if (room) {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        room.paddles[playerIndex] = paddleY;
      }
    }
  });

  socket.on('restartGame', (roomId) => {
    const room = rooms[roomId];
    if (room) {
      room.scores = [0, 0];
      room.ball = { x: 300, y: 200, speedX: 5, speedY: 5 };
      io.to(roomId).emit('restartGame', room.scores);
    }
  });
});

// Function to update the game state
function updateGame(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const { ball, paddles, scores } = room;

  // Update ball position
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Collision with top and bottom walls
  if (ball.y <= 0 || ball.y >= 400) { // Assuming canvas height is 400
    ball.speedY *= -1;
  }

  // Collision with left paddle
  if (ball.x <= 10 + 10) { // Paddle width is 10
    if (ball.y >= paddles[0] && ball.y <= paddles[0] + 100) { // Paddle height is 100
      ball.speedX *= -1;
      // Optional: Increase speed or add randomness
    } else {
      // Player 2 scores
      scores[1] += 1;
      resetBall(room);
    }
  }

  // Collision with right paddle
  if (ball.x >= 600 - 10 - 10) { // Canvas width is 600
    if (ball.y >= paddles[1] && ball.y <= paddles[1] + 100) {
      ball.speedX *= -1;
      // Optional: Increase speed or add randomness
    } else {
      // Player 1 scores
      scores[0] += 1;
      resetBall(room);
    }
  }

  // Emit the updated game state to both players
  io.to(roomId).emit('gameUpdate', {
    paddleY: paddles,
    ballX: ball.x,
    ballY: ball.y,
    scores: scores
  });
}

// Function to reset the ball to the center
function resetBall(room) {
  room.ball.x = 300;
  room.ball.y = 200;
  room.ball.speedX = room.ball.speedX > 0 ? 5 : -5; // Reset speed direction
  room.ball.speedY = 5;
}

server.listen(PORT, '192.168.1.26', () => {
  console.log(`Server is running on http://192.168.1.26:${PORT}`);
});

