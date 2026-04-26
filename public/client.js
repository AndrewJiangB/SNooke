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
const pokerPlanningUi = document.getElementById('poker-planning-ui');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const snakeLeaderboardEntries = document.getElementById('snake-leaderboard-entries');
const statusEl = document.getElementById('status');
const blackjackStatusEl = document.getElementById('blackjack-status');
const planningStatusEl = document.getElementById('planning-status');
const planningPlayersEl = document.getElementById('planning-players');
const planningCardRowEl = document.getElementById('planning-card-row');
const revealAllBtn = document.getElementById('reveal-all-btn');
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
let planningSelectedChoice = null;
let renderedPlanningOptions = [];
let planningRevealMode = false;

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
  planningSelectedChoice = null;
  renderedPlanningOptions = [];
  planningRevealMode = false;
  
  // Clear UI elements
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  playersTable.innerHTML = '';
  statusEl.textContent = 'Connecting...';
  blackjackStatusEl.textContent = '';
  planningStatusEl.textContent = '';
  planningPlayersEl.innerHTML = '';
  planningCardRowEl.innerHTML = '';
  dealerHandEl.textContent = '';
  snakeUi.style.display = 'none';
  blackjackUi.style.display = 'none';
  pokerPlanningUi.style.display = 'none';
  
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
      pokerPlanningUi.style.display = 'none';
      startSnakeGame();
    } else if (game === 'blackjack') {
      snakeUi.style.display = 'none';
      blackjackUi.style.display = 'block';
      pokerPlanningUi.style.display = 'none';
      startBlackjackGame();
    } else if (game === 'pokerPlanning') {
      snakeUi.style.display = 'none';
      blackjackUi.style.display = 'none';
      pokerPlanningUi.style.display = 'block';
      startPokerPlanningGame();
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
    } else if (currentGame === 'pokerPlanning') {
      statusEl.textContent = 'Connected to Poker Planning!';
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
    } else if (msg.type === 'poker_planning_state') {
      state = msg;
      renderPokerPlanning();
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
      let amount;
      if (btn.dataset.bet === 'all') {
        // Prompt for custom bet amount
        let custom = 0;
        if (state && state.players && myId) {
          const me = state.players.find(p => p.id === myId);
          custom = me ? me.bankroll : 0;
        }
        custom = Number(prompt('Enter your custom bet amount:', custom || '100'));
        amount = custom;
      } else {
        amount = Number(btn.dataset.bet);
      }
      if (ws && ws.readyState === WebSocket.OPEN && amount > 0) {
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

function startPokerPlanningGame() {
  startSocket();
  planningSelectedChoice = null;
  renderedPlanningOptions = [];
  planningRevealMode = false;
  revealAllBtn.textContent = 'Reveal all';

  revealAllBtn.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const action = planningRevealMode ? 'resetChoices' : 'revealAll';
      if (action === 'resetChoices') {
        planningSelectedChoice = null;
      }
      planningRevealMode = !planningRevealMode;
      revealAllBtn.textContent = planningRevealMode ? 'Reset' : 'Reveal all';
      syncPlanningSelectionState();
      ws.send(JSON.stringify({
        type: 'action',
        action
      }));
    }
  };
}

function draw() {
  // Snake drawing
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state.food) return;

  ctx.fillStyle = state.food.color || 'yellow';
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
  blackjackStatusEl.textContent = `Phase: ${state.phase} | Queued: ${state.queued}`;
  playersTable.innerHTML = '';

  // Render players
  state.players.forEach((player) => {
    const tr = document.createElement('tr');
    const colorBadge = `<span style="display:inline-block;width:14px;height:14px;background:${player.color || '#999'};border-radius:50%;margin-right:6px;vertical-align:middle;"></span>`;

    // Determine WIN/LOSE at round_end
    let statusDisplay = player.status;
    let statusStyle = '';
    if (state.phase === 'round_end' && player.bet > 0 && player.status !== 'out') {
      // Calculate hand values
      const playerValue = player.hand.length ? player.hand.reduce((acc, card) => acc + (card.v === 'A' ? 11 : card.v === 'K' || card.v === 'Q' || card.v === 'J' ? 10 : Number(card.v)), 0) : 0;
      let aces = player.hand.filter(card => card.v === 'A').length;
      let pVal = playerValue;
      while (pVal > 21 && aces > 0) { pVal -= 10; aces--; }

      const dealer = state.dealer;
      let dealerValue = 0;
      if (dealer && dealer.hand) {
        dealerValue = dealer.hand.length ? dealer.hand.reduce((acc, card) => acc + (card.v === 'A' ? 11 : card.v === 'K' || card.v === 'Q' || card.v === 'J' ? 10 : Number(card.v)), 0) : 0;
        let dAces = dealer.hand.filter(card => card.v === 'A').length;
        while (dealerValue > 21 && dAces > 0) { dealerValue -= 10; dAces--; }
      }

      if (player.status === 'bust' || (pVal < dealerValue && dealerValue <= 21)) {
        statusDisplay = '<span style="color:red;font-weight:bold">LOSE</span>';
      } else if ((dealerValue > 21 && pVal <= 21) || (pVal > dealerValue && pVal <= 21)) {
        statusDisplay = '<span style="color:green;font-weight:bold">WIN</span>';
      } else if (pVal === dealerValue && pVal <= 21) {
        statusDisplay = '<span style="color:gray;font-weight:bold">PUSH</span>';
      }
    }

    tr.innerHTML = `
      <td>${colorBadge}${player.name}${player.id === myId ? ' (You)' : ''}</td>
      <td>${player.bankroll}</td>
      <td>${player.bet}</td>
      <td>${player.hand.map(c => c.v + c.s).join(', ')}</td>
      <td>${player.hand.length ? player.hand.reduce((acc, card) => acc + (card.v === 'A' ? 11 : card.v === 'K' || card.v === 'Q' || card.v === 'J' ? 10 : Number(card.v)), 0) : 0}</td>
      <td>${statusDisplay}</td>
    `;
    playersTable.appendChild(tr);
  });

  // Render dealer info
  if (state.dealer) {
    dealerHandEl.textContent = state.dealer.hand.map(c => c.v + c.s).join(', ');
    const dealerTotalEl = document.getElementById('dealer-total');
    const deckCountEl = document.getElementById('deck-count');
    if (dealerTotalEl) dealerTotalEl.textContent = `Total: ${state.dealer.total}`;
    if (deckCountEl) deckCountEl.textContent = `Deck: ${state.dealer.deckCount} cards left`;
  } else {
    dealerHandEl.textContent = '';
    const dealerTotalEl = document.getElementById('dealer-total');
    const deckCountEl = document.getElementById('deck-count');
    if (dealerTotalEl) dealerTotalEl.textContent = '';
    if (deckCountEl) deckCountEl.textContent = '';
  }
}

function renderPokerPlanning() {
  const me = state.players.find((player) => player.id === myId);
  const selectedCount = state.selectedCount || 0;
  planningRevealMode = Boolean(state.isRevealed);
  if (!me?.hasSelected) {
    planningSelectedChoice = null;
  }
  revealAllBtn.textContent = planningRevealMode ? 'Reset' : 'Reveal all';
  planningStatusEl.textContent = me?.hasSelected
    ? planningRevealMode
      ? 'All estimates are revealed. Press Reset to clear the round.'
      : `${selectedCount}/${state.players.length} players have saved an estimate. Press Reveal all when everyone is ready.`
    : planningRevealMode
      ? 'All estimates are revealed. Press Reset to clear the round.'
      : `Choose a card below to save your estimate. ${selectedCount}/${state.players.length} players are ready.`;

  planningPlayersEl.innerHTML = state.players.map((player) => {
    const voteLabel = player.revealedChoice ?? null;
    const boxClass = voteLabel === null ? 'planning-vote-box pending' : 'planning-vote-box';
    const pendingText = player.hasSelected ? 'Saved' : 'Waiting';

    return `
      <div class="planning-player-card" style="border-color: ${player.color || '#444'};">
        <div class="planning-player-name">${player.name}${player.id === myId ? ' (You)' : ''}</div>
        <div class="${boxClass}">${voteLabel === null ? pendingText : voteLabel}</div>
      </div>
    `;
  }).join('');

  renderPlanningOptionButtons(state.cardOptions || []);
  syncPlanningSelectionState();
}

function renderPlanningOptionButtons(cardOptions) {
  const optionsChanged =
    cardOptions.length !== renderedPlanningOptions.length ||
    cardOptions.some((choice, index) => choice !== renderedPlanningOptions[index]);

  if (!optionsChanged) return;

  renderedPlanningOptions = [...cardOptions];
  planningCardRowEl.innerHTML = cardOptions.map((choice) => `
    <button class="planning-card-btn" data-planning-choice="${choice}">${choice}</button>
  `).join('');
}

function syncPlanningSelectionState() {
  planningCardRowEl.querySelectorAll('[data-planning-choice]').forEach((button) => {
    const isSelected = !planningRevealMode && button.dataset.planningChoice === planningSelectedChoice;
    button.classList.toggle('selected', isSelected);
  });
}

planningCardRowEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-planning-choice]');
  if (!button) return;

  planningSelectedChoice = button.dataset.planningChoice;
  syncPlanningSelectionState();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'action',
      action: 'selectChoice',
      choice: planningSelectedChoice
    }));
  }
});

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
