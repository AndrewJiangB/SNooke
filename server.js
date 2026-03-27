const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = 8080;

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Game state
const BOARD_SIZE = 20;
const TILE_SIZE = 20;
let food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
let players = new Map(); // playerId -> { name, snake: [{x,y}], dir: {dx,dy}, alive: true }
let gameInterval;

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function updateGame() {
  // Move each player
  players.forEach((player) => {
    if (!player.alive) return;

    // New head
    const head = { x: player.snake[0].x + player.dir.dx, y: player.snake[0].y + player.dir.dy };

    // Wrap around edges
    head.x = (head.x + BOARD_SIZE) % BOARD_SIZE;
    head.y = (head.y + BOARD_SIZE) % BOARD_SIZE;

    // Check self-collision
    if (player.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      player.alive = false;
    }

    // Check other snakes
    for (const other of players.values()) {
      if (other !== player && other.alive && other.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        player.alive = false;
      }
    }

    player.snake.unshift(head);

    // Eat food?
    if (head.x === food.x && head.y === food.y) {
      food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
    } else {
      player.snake.pop();
    }
  });

  // Respawn dead players? For now, just mark dead
  const allDead = Array.from(players.values()).every(p => !p.alive);
  if (allDead && players.size > 0) {
    // Reset game
    players.clear();
    food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
  }

  // Broadcast state
  const state = {
    type: 'state',
    boardSize: BOARD_SIZE,
    food,
    players: Array.from(players.entries()).map(([id, p]) => ({ id, ...p }))
  };
  broadcast(state);
}

wss.on('connection', (ws) => {
  const playerId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  const hue = Math.floor(Math.random() * 360);
  console.log(`Player ${playerId} connected`);

  // Create new player
  players.set(playerId, {
    name: `Player ${players.size + 1}`,
    snake: [{ x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) }],
    dir: { dx: 1, dy: 0 },
    alive: true,
    color: `hsl(${hue}, 70%, 50%)`
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'input') {
        const player = players.get(playerId);
        if (player && player.alive) {
          // Prevent reverse direction
          if (msg.dir.dx !== -player.dir.dx || msg.dir.dy !== -player.dir.dy) {
            player.dir = msg.dir;
          }
        }
      }
    } catch (e) {
      console.log('Invalid message:', data);
    }
  });

  ws.on('close', () => {
    players.delete(playerId);
    console.log(`Player ${playerId} disconnected`);
  });
});

// Start game loop at 10 FPS
gameInterval = setInterval(updateGame, 100);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
