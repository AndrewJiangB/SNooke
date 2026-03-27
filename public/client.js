const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const TILE_SIZE = 20;
const BOARD_SIZE = 20;

let myId = null;
let state = { players: [] };

const ws = new WebSocket(`ws://${window.location.host}`);

ws.onopen = () => {
  statusEl.textContent = 'Connected! Use arrows.';
};

ws.onmessage = (event) => {
  state = JSON.parse(event.data);
  if (state.type === 'state') {
    // Assign myId to first player if not set
    if (!myId && state.players.length > 0) {
      myId = state.players[0].id;
    }
    draw();
  }
};

function draw() {
  // Clear
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Food
  ctx.fillStyle = 'yellow';
  ctx.fillRect(state.food.x * TILE_SIZE, state.food.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

  // Players
  state.players.forEach(player => {
    ctx.fillStyle = player.alive ? player.color : '#555';
    player.snake.forEach((segment, i) => {
      ctx.fillRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      if (i === 0) ctx.strokeStyle = '#fff'; // Head outline
      ctx.strokeRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });

    // My snake highlight
    if (player.id === myId && player.alive) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(player.snake[0].x * TILE_SIZE, player.snake[0].y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  });
}

const directions = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
};

document.addEventListener('keydown', (e) => {
  const dir = directions[e.code];
  if (dir) {
    ws.send(JSON.stringify({ type: 'input', dir }));
  }
});
