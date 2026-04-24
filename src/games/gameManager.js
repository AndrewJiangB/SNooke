const snake = require('./snake/snake');
const blackjack = require('./blackjack/blackjack');
const snakeHandler = require('./snake/handler');
const blackjackHandler = require('./blackjack/handler');

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

  if (msg.name) client.name = msg.name;
  if (msg.color) client.color = msg.color;

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
      snake.initPlayer(client.playerId, client.name || msg.name || `Player ${client.playerId}`, client.color || msg.color);
      ws.send(JSON.stringify({ type: 'joined', game: 'snake', playerId: client.playerId }));
      break;
    case 'blackjack':
      const result = blackjack.initPlayer(client.playerId, client.name || msg.name || `Player ${client.playerId}`, client.color);
      ws.send(JSON.stringify({ type: 'joined', game: 'blackjack', queued: result.queued }));
      break;
  }
}

function handleGameAction(ws, msg) {
  const client = clientData.get(ws);
  if (!client || !client.game) return;

  switch (client.game) {
    case 'snake':
      snakeHandler.handleGameAction(client.playerId, msg);
      break;
    case 'blackjack':
      blackjackHandler.handleGameAction(client.playerId, msg);
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
  clientData.set(ws, { playerId, game: null, name: null, color: null });
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