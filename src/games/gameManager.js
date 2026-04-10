const snake = require('./snake');
const blackjack = require('./blackjack');

const clientData = new Map();
const gameClients = { snake: new Set(), blackjack: new Set() };

function joinGame(ws, msg) {
  const client = clientData.get(ws);
  if (!client) return;

  const game = msg.game;
  if (!['snake', 'blackjack'].includes(game)) return;

  if (client.game === game) {
    console.log(`Player ${client.playerId} already in game ${game}`);
    return;
  }

  if (client.game && gameClients[client.game].has(ws)) {
    console.log(`Player ${client.playerId} switching from ${client.game} to ${game}`);
    gameClients[client.game].delete(ws);
    if (client.game === 'snake') snake.removePlayer(client.playerId);
    if (client.game === 'blackjack') blackjack.removePlayer(client.playerId);
  }

  client.game = game;
  gameClients[game].add(ws);

  switch (game) {
    case 'snake':
      snake.initPlayer(client.playerId);
      ws.send(JSON.stringify({ type: 'joined', game: 'snake' }));
      break;
    case 'blackjack':
      const result = blackjack.initPlayer(client.playerId, msg.name || `Player ${client.playerId}`);
      ws.send(JSON.stringify({ type: 'joined', game: 'blackjack', queued: result.queued }));
      break;
  }
}

function handleGameAction(ws, msg) {
  const client = clientData.get(ws);
  if (!client || !client.game) return;

  switch (client.game) {
    case 'snake':
      if (msg.type === 'input' && msg.dir) {
        snake.handleInput(client.playerId, msg.dir);
      }
      break;
    case 'blackjack':
      if (msg.type !== 'action') return;
      if (msg.action === 'bet') blackjack.placeBet(client.playerId, msg.amount);
      if (msg.action === 'hit') blackjack.hit(client.playerId);
      if (msg.action === 'stand') blackjack.stand(client.playerId);
      break;
  }
}

function disconnectGame(ws) {
  const client = clientData.get(ws);
  if (!client) return;

  const { playerId, game } = client;

  switch (game) {
    case 'snake':
      snake.removePlayer(playerId);
      break;
    case 'blackjack':
      blackjack.removePlayer(playerId);
      break;
  }

  if (game && gameClients[game]) {
    gameClients[game].delete(ws);
  }

  clientData.delete(ws);
}

function initConnection(ws) {
  const playerId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  clientData.set(ws, { playerId, game: null });
  return playerId;
}

function updateAllGames(broadcastToGame) {
  const snakeState = snake.updateGame();
  const blackjackState = blackjack.updateGame();

  broadcastToGame('snake', snakeState);
  broadcastToGame('blackjack', blackjackState);
}

module.exports = {
  clientData,
  gameClients,
  initConnection,
  joinGame,
  handleGameAction,
  disconnectGame,
  updateAllGames
};