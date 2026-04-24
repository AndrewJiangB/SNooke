const BOARD_SIZE = 20;

let food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
let players = new Map(); // playerId -> { name, snake: [{x,y}], dir: {dx,dy}, alive: true, color }

function initPlayer(playerId, name, color) {
  const startingColor = color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
  players.set(playerId, {
    name: name || `Player ${players.size + 1}`,
    snake: [{ x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) }],
    dir: { dx: 1, dy: 0 },
    alive: true,
    color: startingColor
  });
}

function removePlayer(playerId) {
  players.delete(playerId);
}

function handleInput(playerId, dir) {
  const player = players.get(playerId);
  if (player && player.alive) {
    // Prevent reverse direction
    if (dir.dx !== -player.dir.dx || dir.dy !== -player.dir.dy) {
      player.dir = dir;
    }
  }
}

function respawnPlayer(playerId) {
  const player = players.get(playerId);
  if (player && !player.alive) {
    // Reset player to starting position
    player.snake = [{ x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) }];
    player.dir = { dx: 1, dy: 0 };
    player.alive = true;
  }
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

  // Return state
  return {
    type: 'state',
    boardSize: BOARD_SIZE,
    food,
    players: Array.from(players.entries()).map(([id, p]) => ({ id, ...p }))
  };
}

module.exports = { initPlayer, removePlayer, handleInput, respawnPlayer, updateGame };