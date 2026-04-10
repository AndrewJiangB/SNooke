const selectionEl = document.getElementById('selection');
const gameEl = document.getElementById('game');
const snakeUi = document.getElementById('snake-ui');
const blackjackUi = document.getElementById('blackjack-ui');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const blackjackStatusEl = document.getElementById('blackjack-status');
const playersTable = document.getElementById('players-table');
const dealerHandEl = document.getElementById('dealer-hand');
const TILE_SIZE = 20;
const BOARD_SIZE = 20;

let myId = null;
let state = { players: [] };
let ws;
let currentGame = null;

document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const game = card.dataset.game;
    currentGame = game;
    selectionEl.style.display = 'none';
    gameEl.style.display = 'flex';

    if (game === 'snake') {
      snakeUi.style.display = 'block';
      blackjackUi.style.display = 'none';
      startSnakeGame();
    } else if (game === 'blackjack') {
      snakeUi.style.display = 'none';
      blackjackUi.style.display = 'block';
      startBlackjackGame();
    }
  });
});

function startSocket() {
  ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    if (currentGame === 'snake') {
      statusEl.textContent = 'Connected to Snake! Use arrows.';
      ws.send(JSON.stringify({ type: 'join', game: 'snake' }));
    } else if (currentGame === 'blackjack') {
      statusEl.textContent = 'Connected to Blackjack!';
      ws.send(JSON.stringify({ type: 'join', game: 'blackjack' }));
    }
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'state') {
      state = msg;
      if (!myId && state.players.length > 0) {
        myId = state.players[0].id;
      }
      draw();
    } else if (msg.type === 'blackjack_state') {
      state = msg;
      renderBlackjack();
    } else if (msg.type === 'joined') {
      if (msg.game === 'blackjack' && msg.queued) {
        blackjackStatusEl.textContent = 'Round in progress; you are queued until next round.';
      }
    }
  };

  ws.onclose = () => {
    statusEl.textContent = 'Disconnected. Refresh to reconnect.';
  };
}

function startSnakeGame() {
  startSocket();
}

function startBlackjackGame() {
  startSocket();
  document.querySelectorAll('[data-bet]').forEach((btn) => {
    btn.onclick = () => {
      const amount = Number(btn.dataset.bet);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'action', action: 'bet', amount }));
      }
    };
  });

  document.getElementById('hit-btn').onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'action', action: 'hit' }));
    }
  };

  document.getElementById('stand-btn').onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'action', action: 'stand' }));
    }
  };
}

function draw() {
  // Snake drawing
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state.food) return;

  ctx.fillStyle = 'yellow';
  ctx.fillRect(state.food.x * TILE_SIZE, state.food.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

  state.players.forEach(player => {
    ctx.fillStyle = player.alive ? player.color : '#555';
    player.snake.forEach((segment, i) => {
      ctx.fillRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      if (i === 0) ctx.strokeStyle = '#fff';
      ctx.strokeRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });

    if (player.id === myId && player.alive) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(player.snake[0].x * TILE_SIZE, player.snake[0].y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.lineWidth = 1;
    }
  });
}

function renderBlackjack() {
  blackjackStatusEl.textContent = `Phase: ${state.phase} | Current turn: ${state.currentPlayerId || '---'} | Queued: ${state.queued}`;
  playersTable.innerHTML = '';

  state.players.forEach((player) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${player.name}${player.id === myId ? ' (You)' : ''}</td>
      <td>${player.bankroll}</td>
      <td>${player.bet}</td>
      <td>${player.hand.map(c => c.v + c.s).join(', ')}</td>
      <td>${player.hand.length ? player.hand.reduce((acc, card) => acc + (card.v === 'A' ? 11 : card.v === 'K' || card.v === 'Q' || card.v === 'J' ? 10 : Number(card.v)), 0) : 0}</td>
      <td>${player.status}</td>
    `;
    playersTable.appendChild(tr);
  });

  dealerHandEl.textContent = state.dealerHand.map(c => c.v + c.s).join(', ');
}

const directions = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
};

document.addEventListener('keydown', (e) => {
  if (currentGame !== 'snake') return;
  const dir = directions[e.code];
  if (dir && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'input', dir }));
  }
});
