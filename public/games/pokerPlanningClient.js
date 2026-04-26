export function createPokerPlanningClient({
  planningStatusEl,
  planningPlayersEl,
  planningCardRowEl,
  revealAllBtn,
  getSocket,
  getMyId
}) {
  let selectedChoice = null;
  let renderedOptions = [];
  let revealMode = false;

  function sendAction(action, extra = {}) {
    const socket = getSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'action', action, ...extra }));
    }
  }

  function syncSelectionState() {
    planningCardRowEl.querySelectorAll('[data-planning-choice]').forEach((button) => {
      const isSelected = !revealMode && button.dataset.planningChoice === selectedChoice;
      button.classList.toggle('selected', isSelected);
    });
  }

  function renderOptionButtons(cardOptions) {
    const optionsChanged =
      cardOptions.length !== renderedOptions.length ||
      cardOptions.some((choice, index) => choice !== renderedOptions[index]);

    if (!optionsChanged) return;

    renderedOptions = [...cardOptions];
    planningCardRowEl.innerHTML = cardOptions.map((choice) => `
      <button class="planning-card-btn" data-planning-choice="${choice}">${choice}</button>
    `).join('');
  }

  revealAllBtn.addEventListener('click', () => {
    const action = revealMode ? 'resetChoices' : 'revealAll';

    if (action === 'resetChoices') {
      selectedChoice = null;
    }

    revealMode = !revealMode;
    revealAllBtn.textContent = revealMode ? 'Reset' : 'Reveal all';
    syncSelectionState();
    sendAction(action);
  });

  planningCardRowEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-planning-choice]');
    if (!button) return;

    selectedChoice = button.dataset.planningChoice;
    syncSelectionState();
    sendAction('selectChoice', { choice: selectedChoice });
  });

  return {
    start() {
      selectedChoice = null;
      renderedOptions = [];
      revealMode = false;
      revealAllBtn.textContent = 'Reveal all';
    },

    reset() {
      selectedChoice = null;
      renderedOptions = [];
      revealMode = false;
      planningStatusEl.textContent = '';
      planningPlayersEl.innerHTML = '';
      planningCardRowEl.innerHTML = '';
      revealAllBtn.textContent = 'Reveal all';
    },

    render(state) {
      const me = state.players.find((player) => player.id === getMyId());
      const selectedCount = state.selectedCount || 0;

      revealMode = Boolean(state.isRevealed);
      if (!me?.hasSelected) {
        selectedChoice = null;
      }

      revealAllBtn.textContent = revealMode ? 'Reset' : 'Reveal all';
      planningStatusEl.textContent = me?.hasSelected
        ? revealMode
          ? 'All estimates are revealed. Press Reset to clear the round.'
          : `${selectedCount}/${state.players.length} players have saved an estimate. Press Reveal all when everyone is ready.`
        : revealMode
          ? 'All estimates are revealed. Press Reset to clear the round.'
          : `Choose a card below to save your estimate. ${selectedCount}/${state.players.length} players are ready.`;

      planningPlayersEl.innerHTML = state.players.map((player) => {
        const voteLabel = player.revealedChoice ?? null;
        const boxClass = voteLabel === null ? 'planning-vote-box pending' : 'planning-vote-box';
        const pendingText = player.hasSelected ? 'Saved' : 'Waiting';

        return `
          <div class="planning-player-card" style="border-color: ${player.color || '#444'};">
            <div class="planning-player-name">${player.name}${player.id === getMyId() ? ' (You)' : ''}</div>
            <div class="${boxClass}">${voteLabel === null ? pendingText : voteLabel}</div>
          </div>
        `;
      }).join('');

      renderOptionButtons(state.cardOptions || []);
      syncSelectionState();
    }
  };
}
