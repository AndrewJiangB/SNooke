const BOARD_SIZE = 20;
// moved to ./snake/snake.js
    }

    player.snake.unshift(head);

    // Eat food?
    if (head.x === food.x && head.y === food.y) {
      food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
    } else {
      player.snake.pop();
    }

    player.dir = moveDir;
    player.nextDir = moveDir;
  });

  // Respawn dead players? For now, just mark dead
  const allDead = Array.from(players.values()).every(p => !p.alive);
  if (allDead && players.size > 0) {
    // Reset game
    //players.clear();
    //food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
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
