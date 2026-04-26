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

function toPositionKey(position) {
	return `${position.x},${position.y}`;
}

function getWrappedHead(head, dir) {
	return {
		x: (head.x + dir.dx + BOARD_SIZE) % BOARD_SIZE,
		y: (head.y + dir.dy + BOARD_SIZE) % BOARD_SIZE
	};
}

function incrementPositionCount(map, position) {
	const key = toPositionKey(position);
	map.set(key, (map.get(key) || 0) + 1);
}

function updateGame() {
	// Cycle food color
	foodColorHue = (foodColorHue + 5) % 360;
	const activeMoves = [];
	const futureBodyCounts = new Map();
	const nextHeadCounts = new Map();
	let foodClaimed = false;
	let nextFood = food;

	players.forEach((player, playerId) => {
		if (!player.alive) return;

		const moveDir = player.nextDir || player.dir;
		const nextHead = getWrappedHead(player.snake[0], moveDir);
		const willGrow = !foodClaimed && nextHead.x === food.x && nextHead.y === food.y;

		if (willGrow) {
			foodClaimed = true;
			nextFood = {
				x: Math.floor(Math.random() * BOARD_SIZE),
				y: Math.floor(Math.random() * BOARD_SIZE)
			};
		}

		activeMoves.push({ playerId, player, moveDir, nextHead, willGrow });
		incrementPositionCount(nextHeadCounts, nextHead);

		const bodyEndIndex = willGrow ? player.snake.length : player.snake.length - 1;
		for (let i = 0; i < bodyEndIndex; i++) {
			incrementPositionCount(futureBodyCounts, player.snake[i]);
		}
	});

	activeMoves.forEach(({ player, moveDir, nextHead, willGrow }) => {
		const nextHeadKey = toPositionKey(nextHead);
		const hitBody = (futureBodyCounts.get(nextHeadKey) || 0) > 0;
		const hitHead = (nextHeadCounts.get(nextHeadKey) || 0) > 1;

		if (hitBody || hitHead) {
			player.alive = false;
		}

		player.snake.unshift(nextHead);
		if (!willGrow) {
			player.snake.pop();
		}

		player.dir = moveDir;
		player.nextDir = moveDir;
	});

	food = nextFood;
	
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
