const lobbyEl = document.getElementById('lobby');
const usernameInput = document.getElementById('username-input');
const colorSwatch = document.getElementById('color-swatch');
const joinBtn = document.getElementById('join-btn');
const selectionEl = document.getElementById('selection');
const gameEl = document.getElementById('game');
const playerNameEl = document.getElementById('player-name');
const playerColorEl = document.getElementById('player-color');
const backBtn = document.getElementById('back-btn');
const snakeUi = document.getElementById('snake-ui');
const blackjackUi = document.getElementById('blackjack-ui');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const snakeLeaderboardEntries = document.getElementById('snake-leaderboard-entries');
const statusEl = document.getElementById('status');
const blackjackStatusEl = document.getElementById('blackjack-status');
const playersTable = document.getElementById('players-table');
const dealerHandEl = document.getElementById('dealer-hand');
const respawnContainer = document.getElementById('respawn-container');
const respawnBtn = document.getElementById('respawn-btn');
const TILE_SIZE = 20;
const BOARD_SIZE = 20;

let myId = null;
let state = { players: [] };
let ws;
let currentGame = null;
let username = '';
let userColor = '';

function generateColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

function updateColorSwatch() {
  colorSwatch.style.backgroundColor = userColor;
  colorSwatch.textContent = '';
}

function showLobby() {
  lobbyEl.classList.add('active');
  selectionEl.classList.remove('active');
  gameEl.style.display = 'none';
}

function showSelection() {
  lobbyEl.classList.remove('active');
  selectionEl.classList.add('active');
  gameEl.style.display = 'none';
}

function showGame() {
  selectionEl.classList.remove('active');
  gameEl.style.display = 'flex';
  // Update header with player name and color
  playerNameEl.textContent = username;
  playerColorEl.style.backgroundColor = userColor;
}

backBtn.addEventListener('click', () => {
  // Close websocket connection
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  // Reset game state
  myId = null;
  state = { players: [] };
  currentGame = null;
  
  // Clear UI elements
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  playersTable.innerHTML = '';
  statusEl.textContent = 'Connecting...';
  blackjackStatusEl.textContent = '';
  dealerHandEl.textContent = '';
  snakeUi.style.display = 'none';
  blackjackUi.style.display = 'none';
  
  // Return to selection
  showSelection();
});

usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click();
  }
});

userColor = generateColor();
updateColorSwatch();
showLobby();

joinBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (!name) {
    usernameInput.focus();
    return;
  }

  username = name;
  userColor = generateColor();
  updateColorSwatch();
  showSelection();
});

document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const game = card.dataset.game;
    currentGame = game;
    showGame();

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
    const joinPayload = {
      type: 'join',
      game: currentGame,
      name: username,
      color: userColor
    };

    if (currentGame === 'snake') {
      statusEl.textContent = 'Connected to Snake! Use arrows.';
    } else if (currentGame === 'blackjack') {
      statusEl.textContent = 'Connected to Blackjack!';
    }

    ws.send(JSON.stringify(joinPayload));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'state') {
      state = msg;
      draw();
    } else if (msg.type === 'blackjack_state') {
      state = msg;
      renderBlackjack();
    } else if (msg.type === 'joined') {
      if (msg.playerId) {
        myId = msg.playerId;
      }
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

  renderSnakeLeaderboard();
}

function renderSnakeLeaderboard() {
  if (!state.players) return;

  // Sort players by score (snake length) descending
  const sorted = [...state.players].sort((a, b) => b.snake.length - a.snake.length);

  snakeLeaderboardEntries.innerHTML = sorted.map(player => `
    <div class="snake-leaderboard-entry">
      <div class="snake-score-color" style="background-color: ${player.color};"></div>
      <div class="snake-score-info">
        <span class="snake-score-name">${player.name}</span>
        <span class="snake-score-length">${player.snake.length}</span>
      </div>
    </div>
  `).join('');

  // Check if current player is dead and show respawn button
  const myPlayer = state.players.find(p => p.id === myId);
  if (myPlayer && !myPlayer.alive) {
    respawnContainer.style.display = 'block';
  } else {
    respawnContainer.style.display = 'none';
  }
}

function renderBlackjack() {
  blackjackStatusEl.textContent = `Phase: ${state.phase} | Current turn: ${state.currentPlayerId || '---'} | Queued: ${state.queued}`;
  playersTable.innerHTML = '';

  state.players.forEach((player) => {
    const tr = document.createElement('tr');
    const colorBadge = `<span style="display:inline-block;width:14px;height:14px;background:${player.color || '#999'};border-radius:50%;margin-right:6px;vertical-align:middle;"></span>`;
    tr.innerHTML = `
      <td>${colorBadge}${player.name}${player.id === myId ? ' (You)' : ''}</td>
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

respawnBtn.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'respawn' }));
  }
});

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
