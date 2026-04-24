// Handles all game-specific actions for Snake
const snake = require('./snake');

function handleGameAction(playerId, msg) {
  if (msg.type === 'input' && msg.dir) {
    snake.handleInput(playerId, msg.dir);
  } else if (msg.type === 'respawn') {
    snake.respawnPlayer(playerId);
  }
}

module.exports = { handleGameAction };