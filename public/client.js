import { createBlackjackClient } from './games/blackjackClient.js';
import { createPokerPlanningClient } from './games/pokerPlanningClient.js';
import { createSnakeClient } from './games/snakeClient.js';

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
const statusEl = document.getElementById('status');
const blackjackStatusEl = document.getElementById('blackjack-status');

let myId = null;
let state = { players: [] };
let ws;
let currentGame = null;
let username = '';
let userColor = '';

const gameViews = {
  snake: {
    container: snakeUi,
    display: 'flex',
    connectedMessage: 'Connected to Snake! Use arrows.',
    client: createSnakeClient({
      canvas: document.getElementById('board'),
      leaderboardEntries: document.getElementById('snake-leaderboard-entries'),
      respawnContainer: document.getElementById('respawn-container'),
      respawnBtn: document.getElementById('respawn-btn'),
      getSocket: () => ws,
      getMyId: () => myId
    })
  },
  blackjack: {
    container: blackjackUi,
    display: 'block',
    connectedMessage: 'Connected to Blackjack!',
    client: createBlackjackClient({
      blackjackStatusEl,
      playersTable: document.getElementById('players-table'),
      dealerHandEl: document.getElementById('dealer-hand'),
      dealerTotalEl: document.getElementById('dealer-total'),
      deckCountEl: document.getElementById('deck-count'),
      hitBtn: document.getElementById('hit-btn'),
      standBtn: document.getElementById('stand-btn'),
      betButtons: document.querySelectorAll('[data-bet]'),
      getSocket: () => ws,
      getState: () => state,
      getMyId: () => myId
    })
  },
  pokerPlanning: {
    container: pokerPlanningUi,
    display: 'block',
    connectedMessage: 'Connected to Poker Planning!',
    client: createPokerPlanningClient({
      planningStatusEl: document.getElementById('planning-status'),
      planningPlayersEl: document.getElementById('planning-players'),
      planningCardRowEl: document.getElementById('planning-card-row'),
      revealAllBtn: document.getElementById('reveal-all-btn'),
      getSocket: () => ws,
      getMyId: () => myId
    })
  }
};

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
  playerNameEl.textContent = username;
  playerColorEl.style.backgroundColor = userColor;
}

function resetGameUi() {
  state = { players: [] };
  myId = null;
  blackjackStatusEl.textContent = '';
  statusEl.textContent = 'Connecting...';

  Object.values(gameViews).forEach(({ container, client }) => {
    container.style.display = 'none';
    client.reset();
  });
}

function setActiveGame(game) {
  Object.entries(gameViews).forEach(([gameName, { container, display }]) => {
    container.style.display = gameName === game ? display : 'none';
  });
}

function connectToCurrentGame() {
  const activeView = gameViews[currentGame];
  if (!activeView) return;

  ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    statusEl.textContent = activeView.connectedMessage;
    ws.send(JSON.stringify({
      type: 'join',
      game: currentGame,
      name: username,
      color: userColor
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'joined') {
      if (msg.playerId) {
        myId = msg.playerId;
      }
      activeView.client.handleJoined?.(msg);
      return;
    }

    state = msg;
    if (msg.type === 'state') {
      gameViews.snake.client.render(msg);
    } else if (msg.type === 'blackjack_state') {
      gameViews.blackjack.client.render(msg);
    } else if (msg.type === 'poker_planning_state') {
      gameViews.pokerPlanning.client.render(msg);
    }
  };

  ws.onclose = () => {
    statusEl.textContent = 'Disconnected. Refresh to reconnect.';
  };
}

function enterGame(game) {
  currentGame = game;
  showGame();
  resetGameUi();
  setActiveGame(game);
  gameViews[game].client.start();
  connectToCurrentGame();
}

backBtn.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }

  ws = null;
  currentGame = null;
  resetGameUi();
  showSelection();
});

usernameInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    joinBtn.click();
  }
});

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

document.querySelectorAll('.game-card').forEach((card) => {
  card.addEventListener('click', () => {
    enterGame(card.dataset.game);
  });
});

document.addEventListener('keydown', (event) => {
  if (currentGame === 'snake') {
    gameViews.snake.client.handleKeyDown(event);
  }
});

userColor = generateColor();
updateColorSwatch();
showLobby();
