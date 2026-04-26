const BOARD_SIZE = 20;

let food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
let foodColorHue = 0;
function getFoodColor() {
	return `hsl(${foodColorHue}, 80%, 50%)`;
}
let players = new Map(); // playerId -> { name, snake: [{x,y}], dir: {dx,dy}, alive: true, color }

function initPlayer(playerId, name, color) {
	const startingColor = color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
	players.set(playerId, {
		name: name || `Player ${players.size + 1}`,
		snake: [{ x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) }],
		dir: { dx: 1, dy: 0 },
		nextDir: { dx: 1, dy: 0 },
		alive: true,
		color: startingColor
	});
}

function removePlayer(playerId) {
	players.delete(playerId);
}

function handleInput(playerId, dir) {
	const player = players.get(playerId);
	if (player && player.alive) {
		// Validate turns against the snake's current travel direction so
		// rapid inputs cannot queue an immediate reversal into the body.
		if (dir.dx !== -player.dir.dx || dir.dy !== -player.dir.dy) {
			player.nextDir = dir;
		}
	}
}

function respawnPlayer(playerId) {
	const player = players.get(playerId);
	if (player && !player.alive) {
		// Reset player to starting position
		player.snake = [{ x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) }];
		player.dir = { dx: 1, dy: 0 };
		player.nextDir = { dx: 1, dy: 0 };
		player.alive = true;
	}
}


function updateGame() {
	// Cycle food color
	foodColorHue = (foodColorHue + 5) % 360;
	// Move each player
	   // Build a hashmap of all body positions (excluding heads) for O(1) collision checks
	   const bodyMap = new Map(); // key: "x,y", value: playerId
	   players.forEach((otherPlayer, otherId) => {
		   if (!otherPlayer.alive) return;
		   for (let i = 1; i < otherPlayer.snake.length; i++) { // skip head
			   const segment = otherPlayer.snake[i];
			   const key = `${segment.x},${segment.y}`;
			   bodyMap.set(key, otherId);
		   }
	   });

	   // Store heads for head-on collision check
	   const headsMap = new Map(); // key: playerId, value: {x, y}

	   players.forEach((player, playerId) => {
		   if (!player.alive) return;

		   const moveDir = player.nextDir || player.dir;
		   const head = { x: player.snake[0].x + moveDir.dx, y: player.snake[0].y + moveDir.dy };
		   head.x = (head.x + BOARD_SIZE) % BOARD_SIZE;
		   head.y = (head.y + BOARD_SIZE) % BOARD_SIZE;

		   // Check self-collision
		   if (player.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
			   player.alive = false;
		   }

		   // Check collision with other players' bodies (excluding heads)
		   const key = `${head.x},${head.y}`;
		   if (bodyMap.has(key)) {
			   player.alive = false;
		   }

		   // Store new head for head-on collision check
		   headsMap.set(playerId, head);
		   player._nextHead = head;

		   player.snake.unshift(head);

		   // Eat food?
		   if (head.x === food.x && head.y === food.y) {
			   food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
		   } else {
			   player.snake.pop();
		   }

		   player.dir = moveDir;
		   player.nextDir = moveDir;
	   });

	   // Efficient head-on collision check using headsMap
	   const alivePlayerIds = Array.from(players.entries()).filter(([_, p]) => p.alive).map(([id]) => id);
	   for (let i = 0; i < alivePlayerIds.length; i++) {
		   const idA = alivePlayerIds[i];
		   const pA = players.get(idA);
		   const headA = headsMap.get(idA);
		   for (let j = i + 1; j < alivePlayerIds.length; j++) {
			   const idB = alivePlayerIds[j];
			   const pB = players.get(idB);
			   const headB = headsMap.get(idB);
			   if (headA && headB && headA.x === headB.x && headA.y === headB.y) {
				   pA.alive = false;
				   pB.alive = false;
			   }
		   }
	   }

	   // Clean up temporary _nextHead property
	   players.forEach((p) => { delete p._nextHead; });
	
	// Respawn dead players? For now, just mark dead
	const allDead = Array.from(players.values()).every(p => !p.alive);
	if (allDead && players.size > 0) {
		// Reset game
		//players.clear();
		//food = { x: Math.floor(Math.random() * BOARD_SIZE), y: Math.floor(Math.random() * BOARD_SIZE) };
	}

	// Return state
	return {
		type: 'state',
		boardSize: BOARD_SIZE,
		food: { ...food, color: getFoodColor() },
		players: Array.from(players.entries()).map(([id, p]) => ({ id, ...p }))
	};
}

function handleGameAction(playerId, msg) {
	if (msg.type === 'input' && msg.dir) {
		handleInput(playerId, msg.dir);
	} else if (msg.type === 'respawn') {
		respawnPlayer(playerId);
	}
}

module.exports = { initPlayer, removePlayer, handleInput, respawnPlayer, updateGame, handleGameAction };