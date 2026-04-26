function getCardValue(card) {
  if (card.v === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.v)) return 10;
  return Number(card.v);
}

function getHandTotal(hand) {
  return hand.reduce((total, card) => total + getCardValue(card), 0);
}

function getResolvedHandTotal(hand) {
  let total = getHandTotal(hand);
  let aces = hand.filter((card) => card.v === 'A').length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function getRoundEndStatus(player, dealer, phase) {
  if (phase !== 'round_end' || player.bet <= 0 || player.status === 'out') {
    return player.status;
  }

  const playerValue = getResolvedHandTotal(player.hand);
  const dealerValue = dealer?.hand ? getResolvedHandTotal(dealer.hand) : 0;

  if (player.status === 'bust' || (playerValue < dealerValue && dealerValue <= 21)) {
    return '<span style="color:red;font-weight:bold">LOSE</span>';
  }

  if ((dealerValue > 21 && playerValue <= 21) || (playerValue > dealerValue && playerValue <= 21)) {
    return '<span style="color:green;font-weight:bold">WIN</span>';
  }

  if (playerValue === dealerValue && playerValue <= 21) {
    return '<span style="color:gray;font-weight:bold">PUSH</span>';
  }

  return player.status;
}

export function createBlackjackClient({
  blackjackStatusEl,
  playersTable,
  dealerHandEl,
  dealerTotalEl,
  deckCountEl,
  hitBtn,
  standBtn,
  betButtons,
  getSocket,
  getState,
  getMyId
}) {
  function sendAction(action, extra = {}) {
    const socket = getSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'action', action, ...extra }));
    }
  }

  betButtons.forEach((button) => {
    button.addEventListener('click', () => {
      let amount;

      if (button.dataset.bet === 'all') {
        const currentState = getState();
        const myPlayer = currentState?.players?.find((player) => player.id === getMyId());
        const suggestedAmount = myPlayer ? myPlayer.bankroll : 100;
        amount = Number(prompt('Enter your custom bet amount:', suggestedAmount || '100'));
      } else {
        amount = Number(button.dataset.bet);
      }

      if (amount > 0) {
        sendAction('bet', { amount });
      }
    });
  });

  hitBtn.addEventListener('click', () => {
    sendAction('hit');
  });

  standBtn.addEventListener('click', () => {
    sendAction('stand');
  });

  return {
    start() {},

    reset() {
      blackjackStatusEl.textContent = '';
      playersTable.innerHTML = '';
      dealerHandEl.textContent = '';
      dealerTotalEl.textContent = '';
      deckCountEl.textContent = '';
    },

    handleJoined(msg) {
      if (msg.queued) {
        blackjackStatusEl.textContent = 'Round in progress; you are queued until next round.';
      }
    },

    render(state) {
      blackjackStatusEl.textContent = `Phase: ${state.phase} | Queued: ${state.queued}`;
      playersTable.innerHTML = '';

      state.players.forEach((player) => {
        const tr = document.createElement('tr');
        const colorBadge = `<span style="display:inline-block;width:14px;height:14px;background:${player.color || '#999'};border-radius:50%;margin-right:6px;vertical-align:middle;"></span>`;

        tr.innerHTML = `
          <td>${colorBadge}${player.name}${player.id === getMyId() ? ' (You)' : ''}</td>
          <td>${player.bankroll}</td>
          <td>${player.bet}</td>
          <td>${player.hand.map((card) => card.v + card.s).join(', ')}</td>
          <td>${getHandTotal(player.hand)}</td>
          <td>${getRoundEndStatus(player, state.dealer, state.phase)}</td>
        `;

        playersTable.appendChild(tr);
      });

      if (!state.dealer) {
        dealerHandEl.textContent = '';
        dealerTotalEl.textContent = '';
        deckCountEl.textContent = '';
        return;
      }

      dealerHandEl.textContent = state.dealer.hand.map((card) => card.v + card.s).join(', ');
      dealerTotalEl.textContent = `Total: ${state.dealer.total}`;
      deckCountEl.textContent = `Deck: ${state.dealer.deckCount} cards left`;
    }
  };
}
