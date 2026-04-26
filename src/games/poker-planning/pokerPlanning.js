const CARD_OPTIONS = ['0', '1', '2', '3', '5', '8', '13', '☕'];

let players = new Map(); // playerId -> { name, color, selectedChoice, revealedChoice }
let isRevealed = false;

function initPlayer(playerId, name, color) {
	players.set(playerId, {
		name: name || `Player ${players.size + 1}`,
		color: color || '#888',
		selectedChoice: null,
		revealedChoice: null,
	});

	return { joined: true };
}

function removePlayer(playerId) {
	players.delete(playerId);
}

function selectChoice(playerId, choice) {
	const player = players.get(playerId);
	if (!player || !CARD_OPTIONS.includes(choice)) return false;

	player.selectedChoice = choice;
	player.revealedChoice = null;
	isRevealed = false;
	return true;
}

function revealAll() {
	players.forEach((player) => {
		player.revealedChoice = player.selectedChoice;
	});
	isRevealed = true;
}

function resetChoices() {
	players.forEach((player) => {
		player.selectedChoice = null;
		player.revealedChoice = null;
	});
	isRevealed = false;
}

function updateGame() {
	return {
		type: 'poker_planning_state',
		cardOptions: CARD_OPTIONS,
		isRevealed,
		selectedCount: Array.from(players.values()).filter((player) => player.selectedChoice !== null).length,
		players: Array.from(players.entries()).map(([id, player]) => ({
			id,
			name: player.name,
			color: player.color,
			hasSelected: player.selectedChoice !== null,
			revealedChoice: player.revealedChoice,
		})),
	};
}

function handleGameAction(playerId, msg) {
	if (msg.type !== 'action') return;

	if (msg.action === 'selectChoice') {
		selectChoice(playerId, String(msg.choice));
	}

	if (msg.action === 'revealAll') {
		revealAll();
	}

	if (msg.action === 'resetChoices') {
		resetChoices();
	}
}

module.exports = {
	initPlayer,
	removePlayer,
	selectChoice,
	revealAll,
	resetChoices,
	updateGame,
	handleGameAction,
};
