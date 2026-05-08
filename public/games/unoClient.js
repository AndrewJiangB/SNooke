const COLOR_NAMES = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createUnoClient({
  unoStatusEl,
  unoTopCardEl,
  unoCurrentColorEl,
  unoDrawPileEl,
  unoPlayersEl,
  unoHandEl,
  unoStartBtn,
  unoDrawBtn,
  unoVictoryEl,
  unoColorPickerEl,
  getSocket,
  getMyId
}) {
  let pendingWildCardId = null;
  let latestState = null;
  let lastStatusText = '';
  let lastTopCardMarkup = '';
  let lastCurrentColorText = '';
  let lastDrawPileText = '';
  let lastPlayersMarkup = '';
  let lastHandMarkup = '';
  let lastVictoryText = '';
  let lastVictoryVisible = false;
  let lastStartVisible = false;
  let lastStartDisabled = false;
  let lastDrawDisabled = false;

  function setTextIfChanged(element, nextValue, previousValueRef) {
    if (previousValueRef.value === nextValue) return;
    element.textContent = nextValue;
    previousValueRef.value = nextValue;
  }

  function setHtmlIfChanged(element, nextValue, previousValueRef) {
    if (previousValueRef.value === nextValue) return;
    element.innerHTML = nextValue;
    previousValueRef.value = nextValue;
  }

  function setDisplayIfChanged(element, visible, displayValue, previousValueRef) {
    if (previousValueRef.value === visible) return;
    element.style.display = visible ? displayValue : 'none';
    previousValueRef.value = visible;
  }

  function resetRenderCache() {
    lastStatusText = '';
    lastTopCardMarkup = '';
    lastCurrentColorText = '';
    lastDrawPileText = '';
    lastPlayersMarkup = '';
    lastHandMarkup = '';
    lastVictoryText = '';
    lastVictoryVisible = false;
    lastStartVisible = false;
    lastStartDisabled = false;
    lastDrawDisabled = false;
  }

  function sendAction(action, extra = {}) {
    const socket = getSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'action', action, ...extra }));
    }
  }

  function playCard(cardId, chosenColor = null) {
    sendAction('playCard', { cardId, chosenColor });
    pendingWildCardId = null;
    unoColorPickerEl.style.display = 'none';
  }

  unoStartBtn.addEventListener('click', () => {
    sendAction('startGame');
  });

  unoDrawBtn.addEventListener('click', () => {
    sendAction('drawCard');
  });

  unoHandEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-card-id]');
    if (!button || !latestState) return;

    const cardId = button.dataset.cardId;
    const card = latestState.yourHand.find((entry) => entry.id === cardId);
    if (!card) return;

    if (card.type === 'wild') {
      pendingWildCardId = cardId;
      unoColorPickerEl.style.display = 'flex';
      return;
    }

    playCard(cardId);
  });

  unoColorPickerEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-uno-color]');
    if (!button || !pendingWildCardId) return;

    playCard(pendingWildCardId, button.dataset.unoColor);
  });

  function renderTopCard(topCard, currentColor) {
    let topCardMarkup = '';
    let currentColorText = '';

    if (!topCard) {
      topCardMarkup = '<div class="uno-card-face empty">Waiting</div>';
    } else {
      topCardMarkup = `
        <div class="uno-card-face ${escapeHtml(topCard.color || 'wild')}">
          <span class="uno-card-value">${escapeHtml(topCard.value)}</span>
        </div>
      `;
      currentColorText = currentColor ? `Current color: ${COLOR_NAMES[currentColor]}` : '';
    }

    setHtmlIfChanged(unoTopCardEl, topCardMarkup, { value: lastTopCardMarkup });
    lastTopCardMarkup = topCardMarkup;

    setTextIfChanged(unoCurrentColorEl, currentColorText, { value: lastCurrentColorText });
    lastCurrentColorText = currentColorText;
  }

  return {
    start() {
      pendingWildCardId = null;
      latestState = null;
      resetRenderCache();
      unoColorPickerEl.style.display = 'none';
    },

    reset() {
      pendingWildCardId = null;
      latestState = null;
      resetRenderCache();
      unoStatusEl.textContent = '';
      unoTopCardEl.innerHTML = '';
      unoCurrentColorEl.textContent = '';
      unoDrawPileEl.textContent = '';
      unoPlayersEl.innerHTML = '';
      unoHandEl.innerHTML = '';
      unoVictoryEl.style.display = 'none';
      unoVictoryEl.textContent = '';
      unoColorPickerEl.style.display = 'none';
    },

    render(state) {
      latestState = state;
      const myId = getMyId();
      const isMyTurn = state.currentPlayerId === myId;

      if (state.phase === 'waiting') {
        lastStatusText = state.players.length < 2
          ? 'Waiting for at least 2 players to start.'
          : 'Ready to start. Everyone in the lobby will be dealt in.';
      } else if (state.phase === 'playing') {
        lastStatusText = isMyTurn
          ? 'Your turn. Play a matching card or draw one.'
          : 'Waiting for the current player to act.';
      } else if (state.phase === 'finished') {
        lastStatusText = `${state.winnerName || 'A player'} wins the round.`;
      }

      setTextIfChanged(unoStatusEl, lastStatusText, { value: unoStatusEl.textContent });

      const startVisible = state.phase === 'waiting' || state.phase === 'finished';
      setDisplayIfChanged(unoStartBtn, startVisible, 'inline-flex', { value: lastStartVisible });
      lastStartVisible = startVisible;

      const startDisabled = state.players.length < 2;
      if (lastStartDisabled !== startDisabled) {
        unoStartBtn.disabled = startDisabled;
        lastStartDisabled = startDisabled;
      }

      const drawDisabled = !isMyTurn || state.phase !== 'playing';
      if (lastDrawDisabled !== drawDisabled) {
        unoDrawBtn.disabled = drawDisabled;
        lastDrawDisabled = drawDisabled;
      }

      const victoryVisible = state.phase === 'finished';
      setDisplayIfChanged(unoVictoryEl, victoryVisible, 'block', { value: lastVictoryVisible });
      lastVictoryVisible = victoryVisible;

      const victoryText = state.phase === 'finished'
        ? `${state.winnerName || 'A player'} wins!`
        : '';
      setTextIfChanged(unoVictoryEl, victoryText, { value: lastVictoryText });
      lastVictoryText = victoryText;

      renderTopCard(state.topCard, state.currentColor);
      const drawPileText = `Draw pile: ${state.drawPileCount} cards`;
      setTextIfChanged(unoDrawPileEl, drawPileText, { value: lastDrawPileText });
      lastDrawPileText = drawPileText;

      const playersMarkup = state.players.map((player) => {
        const classes = ['uno-player-item'];
        if (player.id === state.currentPlayerId && state.phase === 'playing') {
          classes.push('active-turn');
        }

        return `
          <div class="${classes.join(' ')}">
            <span class="uno-player-dot" style="background:${escapeHtml(player.color || '#999')}"></span>
            <span class="uno-player-name">${escapeHtml(player.name)}${player.id === myId ? ' (You)' : ''}</span>
            <span class="uno-player-count">${player.cardCount} cards</span>
          </div>
        `;
      }).join('');
      setHtmlIfChanged(unoPlayersEl, playersMarkup, { value: lastPlayersMarkup });
      lastPlayersMarkup = playersMarkup;

      const playableCardIds = new Set(state.playableCardIds || []);
      const handMarkup = (state.yourHand || []).map((card) => {
        const canPlay = isMyTurn && playableCardIds.has(card.id) && state.phase === 'playing';
        return `
          <button
            class="uno-hand-card ${escapeHtml(card.color || 'wild')} ${canPlay ? 'playable' : ''}"
            data-card-id="${escapeHtml(card.id)}"
            ${canPlay ? '' : 'disabled'}
          >
            <span class="uno-card-value">${escapeHtml(card.value)}</span>
          </button>
        `;
      }).join('');
      setHtmlIfChanged(unoHandEl, handMarkup, { value: lastHandMarkup });
      lastHandMarkup = handMarkup;
    }
  };
}
