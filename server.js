const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = 8080;

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const gameManager = require('./src/games/gameManager');

function broadcastToGame(game, data) {
  const clients = gameManager.gameClients[game];
  if (!clients) return;

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

function updateAllGames() {
  gameManager.updateAllGames(broadcastToGame);
}

wss.on('connection', (ws) => {
  const playerId = gameManager.initConnection(ws);
  console.log(`Player ${playerId} connected`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'join') {
        gameManager.joinGame(ws, msg);
      } else {
        gameManager.handleGameAction(ws, msg);
      }
    } catch (e) {
      console.log('Invalid message:', data);
    }
  });

  ws.on('close', () => {
    gameManager.disconnectGame(ws);
    console.log(`Player ${playerId} disconnected`);
  });
});

// Start game loop
setInterval(updateAllGames, 100);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
