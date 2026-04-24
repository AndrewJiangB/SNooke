// Handles all game-specific actions for Blackjack
const blackjack = require('./blackjack');

function handleGameAction(playerId, msg) {
  if (msg.type !== 'action') return;
  if (msg.action === 'bet') blackjack.placeBet(playerId, msg.amount);
  if (msg.action === 'hit') blackjack.hit(playerId);
  if (msg.action === 'stand') blackjack.stand(playerId);
}

module.exports = { handleGameAction };