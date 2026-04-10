const BET_OPTIONS = [5, 10, 25, 50, 100];
const STARTING_BANKROLL = 100;

let players = new Map(); // playerId -> { name, bankroll, bet, hand, status }
let queuedPlayers = []; // join waiting list while a round is in progress
let dealerHand = [];
let deck = [];
let phase = 'waiting'; // waiting -> betting -> playing -> dealer -> round_end
let currentPlayerIds = [];
let currentTurnIndex = 0;
let roundEndTimer = 0;

function newDeck() {
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['♠', '♥', '♦', '♣'];
  const d = [];
  for (const s of suits) for (const v of values) d.push({ v, s });
  return d.sort(() => Math.random() - 0.5);
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.v === 'A') {
      aces += 1;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.v)) {
      total += 10;
    } else {
      total += parseInt(card.v, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function drawCard() {
  if (deck.length === 0) deck = newDeck();
  return deck.pop();
}

function resetRound() {
  dealerHand = [];
  deck = newDeck();
  currentPlayerIds = Array.from(players.keys());
  currentTurnIndex = 0;
  players.forEach((p) => {
    p.bet = 0;
    p.hand = [];
    p.status = 'betting';
  });
  phase = players.size > 0 ? 'betting' : 'waiting';
}

function leadToNextPlayer() {
  currentTurnIndex += 1;
  while (currentTurnIndex < currentPlayerIds.length) {
    const playerId = currentPlayerIds[currentTurnIndex];
    const p = players.get(playerId);
    if (p && ['playing'].includes(p.status)) {
      return;
    }
    currentTurnIndex += 1;
  }
  phase = 'dealer';
}

function startDealerTurn() {
  while (handValue(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }
  phase = 'round_end';
  roundEndTimer = Date.now() + 4000;
}

function resolveRound() {
  const dealerValue = handValue(dealerHand);

  players.forEach((p) => {
    if (p.bet <= 0) {
      return;
    }
    const playerValue = handValue(p.hand);

    if (p.status === 'bust') {
      // lose
    } else if (dealerValue > 21 || playerValue > dealerValue) {
      p.bankroll += p.bet;
    } else if (playerValue === dealerValue) {
      // push
    } else {
      p.bankroll -= p.bet;
      if (p.bankroll < 0) p.bankroll = 0;
    }
    if (p.bankroll === 0) {
      p.status = 'out';
    }
  });

  // move queued players now that round ended
  queuedPlayers.forEach((q) => {
    players.set(q.playerId, q.player);
  });
  queuedPlayers = [];

  // drop everyone with 0 bankroll
  for (const [id, p] of players.entries()) {
    if (p.bankroll === 0) players.delete(id);
  }

  if (players.size > 0) {
    resetRound();
  } else {
    phase = 'waiting';
  }
}

function initPlayer(playerId, name) {
  if (phase !== 'waiting' && phase !== 'betting') {
    // round active, queue for next round
    queuedPlayers.push({ playerId, player: { name, bankroll: STARTING_BANKROLL, bet: 0, hand: [], status: 'waiting' } });
    return { queued: true };
  }

  players.set(playerId, { name, bankroll: STARTING_BANKROLL, bet: 0, hand: [], status: 'betting' });
  if (phase === 'waiting') phase = 'betting';
  return { queued: false };
}

function removePlayer(playerId) {
  players.delete(playerId);
  queuedPlayers = queuedPlayers.filter(q => q.playerId !== playerId);
  if (players.size === 0) phase = 'waiting';
}

function placeBet(playerId, amount) {
  const player = players.get(playerId);
  if (!player || phase !== 'betting' || !BET_OPTIONS.includes(amount)) return false;
  if (amount > player.bankroll) return false;
  player.bet = amount;
  player.status = 'ready';

  const readyCount = Array.from(players.values()).filter(p => p.status === 'ready').length;
  if (readyCount === players.size) {
    phase = 'playing';
    deck = newDeck();
    dealerHand = [drawCard(), drawCard()];

    players.forEach((p) => {
      p.hand = [drawCard(), drawCard()];
      p.status = handValue(p.hand) === 21 ? 'stand' : 'playing';
    });

    currentPlayerIds = Array.from(players.keys());
    currentTurnIndex = 0;
    while (currentTurnIndex < currentPlayerIds.length && players.get(currentPlayerIds[currentTurnIndex]).status !== 'playing') {
      currentTurnIndex += 1;
    }
    if (currentTurnIndex >= currentPlayerIds.length) phase = 'dealer';
  }
  return true;
}

function hit(playerId) {
  if (phase !== 'playing') return false;
  const player = players.get(playerId);
  if (!player || currentPlayerIds[currentTurnIndex] !== playerId || player.status !== 'playing') return false;

  player.hand.push(drawCard());
  if (handValue(player.hand) > 21) {
    player.status = 'bust';
    leadToNextPlayer();
  }
  return true;
}

function stand(playerId) {
  if (phase !== 'playing') return false;
  const player = players.get(playerId);
  if (!player || currentPlayerIds[currentTurnIndex] !== playerId || player.status !== 'playing') return false;

  player.status = 'stand';
  leadToNextPlayer();
  return true;
}

function updateGame() {
  if (phase === 'dealer') {
    startDealerTurn();
  } else if (phase === 'round_end' && Date.now() >= roundEndTimer) {
    resolveRound();
  }

  const publicDealer = phase === 'round_end' || phase === 'waiting' || phase === 'betting' ? dealerHand : [dealerHand[0], { v: '?', s: '' }];

  return {
    type: 'blackjack_state',
    phase,
    players: Array.from(players.entries()).map(([id, p]) => ({ id, ...p })),
    dealerHand: publicDealer,
    currentPlayerId: currentPlayerIds[currentTurnIndex] || null,
    betOptions: BET_OPTIONS,
    queued: queuedPlayers.length,
  };
}

module.exports = { initPlayer, removePlayer, placeBet, hit, stand, updateGame, resetRound };
