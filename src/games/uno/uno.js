const COLORS = ['red', 'yellow', 'green', 'blue'];
const COLOR_LABELS = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

let players = new Map(); // playerId -> { name, color, hand, inRound }
let phase = 'waiting'; // waiting -> playing -> finished
let turnOrder = [];
let currentTurnIndex = 0;
let direction = 1;
let drawPile = [];
let discardPile = [];
let currentColor = null;
let winnerId = null;
let drawnPlayableCardState = null; // { playerId, cardId }

function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createCard(color, value, type) {
  return {
    id: `${color || 'wild'}-${type}-${value}-${Math.random().toString(36).slice(2, 9)}`,
    color,
    value,
    type,
    label: color ? `${COLOR_LABELS[color]} ${value}` : value,
  };
}

function createDeck() {
  const deck = [];

  for (const color of COLORS) {
    deck.push(createCard(color, '0', 'number'));

    for (let value = 1; value <= 9; value += 1) {
      deck.push(createCard(color, String(value), 'number'));
      deck.push(createCard(color, String(value), 'number'));
    }

    ['Skip', 'Reverse', 'Draw Two'].forEach((value) => {
      deck.push(createCard(color, value, 'action'));
      deck.push(createCard(color, value, 'action'));
    });
  }

  for (let i = 0; i < 4; i += 1) {
    deck.push(createCard(null, 'Wild', 'wild'));
    deck.push(createCard(null, 'Wild Draw Four', 'wild'));
  }

  return shuffle(deck);
}

function refillDrawPile() {
  if (drawPile.length > 0) return;
  if (discardPile.length <= 1) return;

  const topCard = discardPile.pop();
  drawPile = shuffle(discardPile);
  discardPile = [topCard];
}

function drawCard() {
  refillDrawPile();
  return drawPile.pop() || null;
}

function getCurrentPlayerId() {
  return turnOrder[currentTurnIndex] || null;
}

function getPlayer(playerId) {
  return players.get(playerId) || null;
}

function getActivePlayerIds() {
  return turnOrder.filter((playerId) => {
    const player = players.get(playerId);
    return player && player.inRound;
  });
}

function getTopCard() {
  return discardPile[discardPile.length - 1] || null;
}

function advanceTurn(steps = 1) {
  const activePlayerIds = getActivePlayerIds();
  if (activePlayerIds.length <= 1) return;

  const currentPlayerId = getCurrentPlayerId();
  let nextIndex = activePlayerIds.indexOf(currentPlayerId);
  if (nextIndex === -1) {
    currentTurnIndex = 0;
    return;
  }

  nextIndex = (nextIndex + (direction * steps)) % activePlayerIds.length;
  if (nextIndex < 0) nextIndex += activePlayerIds.length;
  currentTurnIndex = turnOrder.indexOf(activePlayerIds[nextIndex]);
}

function findWinner() {
  for (const [playerId, player] of players.entries()) {
    if (player.inRound && player.hand.length === 0) {
      return playerId;
    }
  }
  return null;
}

function ensureWinnerIfNeeded() {
  const activePlayerIds = getActivePlayerIds();
  const emptyHandWinner = findWinner();

  if (emptyHandWinner) {
    winnerId = emptyHandWinner;
    phase = 'finished';
    return true;
  }

  if (activePlayerIds.length === 1) {
    winnerId = activePlayerIds[0];
    phase = 'finished';
    return true;
  }

  if (activePlayerIds.length === 0) {
    winnerId = null;
    phase = 'waiting';
    return true;
  }

  return false;
}

function resetLobbyState() {
  phase = 'waiting';
  turnOrder = [];
  currentTurnIndex = 0;
  direction = 1;
  drawPile = [];
  discardPile = [];
  currentColor = null;
  winnerId = null;
  drawnPlayableCardState = null;

  players.forEach((player) => {
    player.hand = [];
    player.inRound = false;
  });
}

function initPlayer(playerId, name, color) {
  players.set(playerId, {
    name: name || `Player ${players.size + 1}`,
    color: color || '#888',
    hand: [],
    inRound: false,
  });
}

function clearDrawnPlayableCardState() {
  drawnPlayableCardState = null;
}

function removePlayer(playerId) {
  const currentPlayerId = getCurrentPlayerId();
  const removedCurrentPlayer = currentPlayerId === playerId;
  if (drawnPlayableCardState?.playerId === playerId) {
    clearDrawnPlayableCardState();
  }
  players.delete(playerId);
  turnOrder = turnOrder.filter((id) => id !== playerId);

  if (turnOrder.length === 0 || players.size === 0) {
    resetLobbyState();
    return;
  }

  if (!removedCurrentPlayer && currentPlayerId && turnOrder.includes(currentPlayerId)) {
    currentTurnIndex = turnOrder.indexOf(currentPlayerId);
  } else if (currentTurnIndex >= turnOrder.length) {
    currentTurnIndex = 0;
  }

  if (phase === 'playing') {
    if (removedCurrentPlayer) {
      currentTurnIndex = Math.min(currentTurnIndex, turnOrder.length - 1);
    }
    ensureWinnerIfNeeded();
  } else if (phase === 'finished') {
    if (!winnerId || !players.has(winnerId)) {
      winnerId = null;
    }
  }
}

function canPlayOnTop(card, topCard) {
  if (!topCard) return true;
  if (card.type === 'wild') return true;
  if (card.color === currentColor) return true;
  if (topCard.type !== 'wild' && card.value === topCard.value) return true;
  return false;
}

function getPlayableCardIds(player) {
  if (!player) return [];

  const topCard = getTopCard();
  const matchingCards = player.hand.filter((card) => canPlayOnTop(card, topCard));

  if (drawnPlayableCardState && drawnPlayableCardState.playerId === getCurrentPlayerId()) {
    return matchingCards
      .filter((card) => card.id === drawnPlayableCardState.cardId)
      .map((card) => card.id);
  }

  return matchingCards.map((card) => card.id);
}

function drawCardsForPlayer(playerId, count) {
  const player = getPlayer(playerId);
  if (!player) return;

  for (let i = 0; i < count; i += 1) {
    const card = drawCard();
    if (card) {
      player.hand.push(card);
    }
  }
}

function applyActionCard(card) {
  if (card.type !== 'action' && card.type !== 'wild') {
    advanceTurn(1);
    return;
  }

  if (card.value === 'Skip') {
    advanceTurn(2);
    return;
  }

  if (card.value === 'Reverse') {
    const activePlayerIds = getActivePlayerIds();
    if (activePlayerIds.length <= 2) {
      advanceTurn(2);
      return;
    }

    direction *= -1;
    advanceTurn(1);
    return;
  }

  if (card.value === 'Draw Two') {
    advanceTurn(1);
    drawCardsForPlayer(getCurrentPlayerId(), 2);
    advanceTurn(1);
    return;
  }

  if (card.value === 'Wild') {
    advanceTurn(1);
    return;
  }

  if (card.value === 'Wild Draw Four') {
    advanceTurn(1);
    drawCardsForPlayer(getCurrentPlayerId(), 4);
    advanceTurn(1);
    return;
  }

  advanceTurn(1);
}

function prepareOpeningDiscard() {
  let openingCard = drawCard();

  while (openingCard && openingCard.value === 'Wild Draw Four') {
    drawPile.unshift(openingCard);
    openingCard = drawCard();
  }

  if (!openingCard) return;

  discardPile.push(openingCard);
  currentColor = openingCard.color || COLORS[Math.floor(Math.random() * COLORS.length)];

  if (openingCard.value === 'Skip') {
    advanceTurn(1);
  } else if (openingCard.value === 'Reverse') {
    if (getActivePlayerIds().length <= 2) {
      advanceTurn(1);
    } else {
      direction = -1;
      currentTurnIndex = turnOrder.length - 1;
    }
  } else if (openingCard.value === 'Draw Two') {
    drawCardsForPlayer(getCurrentPlayerId(), 2);
    advanceTurn(1);
  } else if (openingCard.value === 'Wild') {
    currentColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  }
}

function startGame() {
  if (players.size < 2) return false;

  phase = 'playing';
  direction = 1;
  winnerId = null;
  clearDrawnPlayableCardState();
  drawPile = createDeck();
  discardPile = [];
  turnOrder = Array.from(players.keys());
  currentTurnIndex = 0;

  players.forEach((player) => {
    player.hand = [];
    player.inRound = true;
  });

  for (let round = 0; round < 7; round += 1) {
    turnOrder.forEach((playerId) => {
      const player = getPlayer(playerId);
      const card = drawCard();
      if (player && card) {
        player.hand.push(card);
      }
    });
  }

  prepareOpeningDiscard();
  return true;
}

function playCard(playerId, cardId, chosenColor) {
  if (phase !== 'playing' || getCurrentPlayerId() !== playerId) return false;

  const player = getPlayer(playerId);
  const topCard = getTopCard();
  if (!player) return false;

  const cardIndex = player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) return false;

  const card = player.hand[cardIndex];
  const playableCardIds = new Set(getPlayableCardIds(player));
  if (!playableCardIds.has(card.id) || !canPlayOnTop(card, topCard)) return false;

  if (card.type === 'wild' && !COLORS.includes(chosenColor)) return false;

  player.hand.splice(cardIndex, 1);
  discardPile.push(card);
  currentColor = card.type === 'wild' ? chosenColor : card.color;
  clearDrawnPlayableCardState();

  if (ensureWinnerIfNeeded()) {
    return true;
  }

  applyActionCard(card);
  ensureWinnerIfNeeded();
  return true;
}

function drawTurnCard(playerId) {
  if (phase !== 'playing' || getCurrentPlayerId() !== playerId) return false;

  const player = getPlayer(playerId);
  if (!player) return false;
  if (drawnPlayableCardState?.playerId === playerId) return false;
  if (getPlayableCardIds(player).length > 0) return false;

  const card = drawCard();
  if (!card) return false;

  player.hand.push(card);

  if (canPlayOnTop(card, getTopCard())) {
    drawnPlayableCardState = { playerId, cardId: card.id };
    return true;
  }

  clearDrawnPlayableCardState();
  advanceTurn(1);
  return true;
}

function passTurn(playerId) {
  if (phase !== 'playing' || getCurrentPlayerId() !== playerId) return false;
  if (!drawnPlayableCardState || drawnPlayableCardState.playerId !== playerId) return false;

  clearDrawnPlayableCardState();
  advanceTurn(1);
  return true;
}

function updateGame() {
  return {
    type: 'uno_state',
    phase,
    currentPlayerId: getCurrentPlayerId(),
    currentColor,
    topCard: getTopCard(),
    winnerId,
    players: Array.from(players.entries()).map(([id, player]) => ({
      id,
      name: player.name,
      color: player.color,
      cardCount: player.hand.length,
      inRound: player.inRound,
    })),
    drawPileCount: drawPile.length,
    discardCount: discardPile.length,
  };
}

function getStateForPlayer(playerId) {
  const baseState = updateGame();
  const me = getPlayer(playerId);
  const playableCardIds = me ? getPlayableCardIds(me) : [];

  return {
    ...baseState,
    yourHand: me ? me.hand.map((card) => ({ ...card })) : [],
    playableCardIds,
    canDrawCard: Boolean(
      me &&
      phase === 'playing' &&
      getCurrentPlayerId() === playerId &&
      !drawnPlayableCardState &&
      playableCardIds.length === 0
    ),
    canPassTurn: Boolean(
      phase === 'playing' &&
      drawnPlayableCardState &&
      drawnPlayableCardState.playerId === playerId
    ),
    hasDrawnPlayableCard: Boolean(
      drawnPlayableCardState &&
      drawnPlayableCardState.playerId === playerId
    ),
    winnerName: winnerId && players.has(winnerId) ? players.get(winnerId).name : null,
  };
}

function handleGameAction(playerId, msg) {
  if (msg.type !== 'action') return;

  if (msg.action === 'startGame') {
    startGame();
  }

  if (msg.action === 'playCard') {
    playCard(playerId, String(msg.cardId), msg.chosenColor ? String(msg.chosenColor) : null);
  }

  if (msg.action === 'drawCard') {
    drawTurnCard(playerId);
  }

  if (msg.action === 'passTurn') {
    passTurn(playerId);
  }
}

module.exports = {
  initPlayer,
  removePlayer,
  startGame,
  updateGame,
  getStateForPlayer,
  handleGameAction,
};
