const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

let rooms = {}; // Object to keep track of active rooms and players

io.on('connection', (socket) => {
    console.log('a user connected');
  
    socket.on('createGame', () => {
      const roomId = Math.random().toString(36).substr(2, 9); // Generate a random room ID
      rooms[roomId] = {
        players: [socket.id],
        paddles: [150, 150],
        scores: [0, 0] // Add a score array to track each player's score
      };
      socket.join(roomId);
      socket.emit('roomCreated', roomId);
    });
  
    socket.on('joinGame', (roomId) => {
      if (rooms[roomId] && rooms[roomId].players.length < 2) {
        socket.join(roomId);
        rooms[roomId].players.push(socket.id);
        io.to(roomId).emit('startGame', { roomId, playerIndex: rooms[roomId].players.indexOf(socket.id) });
      } else {
        socket.emit('roomError', 'Room is full or does not exist');
      }
    });
  
    socket.on('disconnect', () => {
      console.log('a user disconnected');
      // Clean up rooms when players disconnect
      for (const [roomId, room] of Object.entries(rooms)) {
        if (room.players.includes(socket.id)) {
          room.players = room.players.filter(id => id !== socket.id);
          if (room.players.length === 0) {
            delete rooms[roomId];
          }
        }
      }
    });
  
    socket.on('gameUpdate', (data) => {
      const roomId = data.roomId;
      const playerIndex = rooms[roomId].players.indexOf(socket.id);
  
      // Update the specific player's paddle position
      if (data.paddleY !== undefined) {
        rooms[roomId].paddles[playerIndex] = data.paddleY;
      }
  
      // Check if the ball is out of bounds and update the score
      if (data.ballX <= 0) {
        rooms[roomId].scores[1] += 1; // Player 2 scores
        resetBall(roomId);
      } else if (data.ballX >= 600) { // Assuming canvas width is 600
        rooms[roomId].scores[0] += 1; // Player 1 scores
        resetBall(roomId);
      } else {
        // Broadcast the updated game state to both players
        io.to(roomId).emit('gameUpdate', {
          paddleY: rooms[roomId].paddles,
          ballX: data.ballX,
          ballY: data.ballY,
          scores: rooms[roomId].scores
        });
      }
    });
  
    socket.on('restartGame', (roomId) => {
      if (rooms[roomId]) {
        resetBall(roomId);
        io.to(roomId).emit('restartGame', rooms[roomId].scores); // Broadcast restart event
      }
    });
  
    function resetBall(roomId) {
      // Send the ball back to the center
      io.to(roomId).emit('gameUpdate', {
        paddleY: rooms[roomId].paddles,
        ballX: 300, // Reset to the center of the canvas
        ballY: 200, // Reset to the center of the canvas
        scores: rooms[roomId].scores
      });
    }
  });

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
