// public/js/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const paddleWidth = 10;
const paddleHeight = 100;
let paddleY = [150, 150];
let ballX = 300, ballY = 200;
let ballSpeedX = 5, ballSpeedY = 5;
let scores = [0, 0]; // Track the scores

let gameInterval = null;

// Handle mouse movement to control paddle
canvas.addEventListener('mousemove', (event) => {
    if (gameActive) {
        const rect = canvas.getBoundingClientRect();
        const paddleYPos = event.clientY - rect.top - paddleHeight / 2;

        // Clamp paddle position within the canvas
        paddleYPos = Math.max(0, Math.min(paddleYPos, canvas.height - paddleHeight));

        // Emit the correct paddle position based on the player
        socket.emit('gameUpdate', { roomId, paddleY: paddleYPos });
    }
});

// Start the game loop
function startGame() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        if (gameActive) {
            updateGame();
            drawGame();
        }
    }, 1000 / 60); // 60 FPS for smoother gameplay
}

// Update game state
function updateGame() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Collision with top and bottom walls
    if (ballY <= 0 || ballY >= canvas.height) ballSpeedY *= -1;

    // Collision with paddles
    if (ballX <= paddleWidth) {
        if (ballY >= paddleY[0] && ballY <= paddleY[0] + paddleHeight) {
            ballSpeedX *= -1;
            ballX = paddleWidth; // Prevent sticking
        } else {
            // Player 2 scores
            socket.emit('gameUpdate', { roomId, ballX, ballY });
        }
    } else if (ballX >= canvas.width - paddleWidth) {
        if (ballY >= paddleY[1] && ballY <= paddleY[1] + paddleHeight) {
            ballSpeedX *= -1;
            ballX = canvas.width - paddleWidth; // Prevent sticking
        } else {
            // Player 1 scores
            socket.emit('gameUpdate', { roomId, ballX, ballY });
        }
    }

    // Emit ball position to the server
    socket.emit('gameUpdate', { roomId, ballX, ballY });
}

// Draw the game elements
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    ctx.fillStyle = 'white';
    ctx.fillRect(0, paddleY[0], paddleWidth, paddleHeight); // Player 1 paddle
    ctx.fillRect(canvas.width - paddleWidth, paddleY[1], paddleWidth, paddleHeight); // Player 2 paddle

    // Draw ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Update the score display
    scoreBoard.innerText = `Score: ${scores[0]} - ${scores[1]}`;
}

// Handle game updates from the server
socket.on('gameUpdate', (data) => {
    if (data.paddleY) paddleY = data.paddleY;
    if (data.ballX !== undefined) ballX = data.ballX;
    if (data.ballY !== undefined) ballY = data.ballY;
    if (data.scores) scores = data.scores;
});

// Handle game restart
socket.on('restartGame', (newScores) => {
    ballX = 300; // Reset the ball position
    ballY = 200;
    scores = newScores;
    drawGame(); // Redraw the game to show the reset state
    console.log('Game restarted');
});
