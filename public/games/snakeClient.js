const TILE_SIZE = 20;

const DIRECTIONS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
};

export function createSnakeClient({
  canvas,
  leaderboardEntries,
  respawnContainer,
  respawnBtn,
  getSocket,
  getMyId
}) {
  const ctx = canvas.getContext('2d');

  respawnBtn.addEventListener('click', () => {
    const socket = getSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'respawn' }));
    }
  });

  function resetBoard() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function renderLeaderboard(state) {
    if (!state.players) return;

    const sortedPlayers = [...state.players].sort((a, b) => b.snake.length - a.snake.length);

    leaderboardEntries.innerHTML = sortedPlayers.map((player) => `
      <div class="snake-leaderboard-entry">
        <div class="snake-score-color" style="background-color: ${player.color};"></div>
        <div class="snake-score-info">
          <span class="snake-score-name">${player.name}</span>
          <span class="snake-score-length">${player.snake.length}</span>
        </div>
      </div>
    `).join('');

    const myPlayer = state.players.find((player) => player.id === getMyId());
    respawnContainer.style.display = myPlayer && !myPlayer.alive ? 'block' : 'none';
  }

  return {
    start() {
      respawnContainer.style.display = 'none';
    },

    reset() {
      resetBoard();
      leaderboardEntries.innerHTML = '';
      respawnContainer.style.display = 'none';
    },

    render(state) {
      resetBoard();
      if (!state.food) return;

      ctx.fillStyle = state.food.color || 'yellow';
      ctx.fillRect(state.food.x * TILE_SIZE, state.food.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      state.players.forEach((player) => {
        ctx.fillStyle = player.alive ? player.color : '#555';

        player.snake.forEach((segment, index) => {
          ctx.fillRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          if (index === 0) {
            ctx.strokeStyle = '#fff';
          }
          ctx.strokeRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        if (player.id === getMyId() && player.alive) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(
            player.snake[0].x * TILE_SIZE,
            player.snake[0].y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          );
          ctx.lineWidth = 1;
        }
      });

      renderLeaderboard(state);
    },

    handleKeyDown(event) {
      const dir = DIRECTIONS[event.code];
      const socket = getSocket();

      if (dir && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', dir }));
      }
    }
  };
}
