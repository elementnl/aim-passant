const GAME_OVER_REASONS = {
  'checkmate': 'Checkmate!',
  'king-captured': 'The King has fallen!',
  'draw': 'The game ended in a draw.',
};

const Game = (() => {
  let myColor = null;

  function init() {
    Audio.preload();
    Lobby.init();
    FPS.init();

    Network.on('game-start', ({ chess }) => {
      myColor = Lobby.getMyColor();
      ChessUI.init(myColor);
      ChessUI.update(chess);
      showScreen('chess');
    });

    Network.on('chess-update', (state) => {
      ChessUI.update(state);
    });

    Network.on('duel-start', ({ attacker, defender, spawns, arenaIndex }) => {
      showScreen('duel');

      FPS.startDuel({
        myRole: attacker.color === myColor ? 'attacker' : 'defender',
        attacker,
        defender,
        spawns,
        arenaIndex,
      });
    });

    Network.on('duel-end', ({ winner, state }) => {
      FPS.endDuel(winner);

      const myRole = state.turn === myColor ? 'defender' : 'attacker';
      const iWon = (myRole === 'attacker' && winner === 'attacker') ||
                   (myRole === 'defender' && winner === 'defender');

      Audio.play('explosion');
      setTimeout(() => Audio.play(iWon ? 'duelWin' : 'duelLoss'), 300);

      showDuelResult(iWon);

      setTimeout(() => {
        hideDuelResult();
        ChessUI.update(state);
        showScreen('chess');
      }, 2500);
    });

    Network.on('game-over', ({ reason, winner }) => {
      const delay = FPS.isActive() ? 3000 : 500;
      setTimeout(() => {
        showScreen('gameover');

        const title = document.getElementById('gameover-title');
        if (winner === myColor) {
          title.textContent = 'YOU WIN!';
          title.style.color = '#27ae60';
        } else if (winner) {
          title.textContent = 'YOU LOSE';
          title.style.color = '#c0392b';
        } else {
          title.textContent = 'DRAW';
          title.style.color = '#666';
        }

        document.getElementById('gameover-reason').textContent =
          GAME_OVER_REASONS[reason] || reason;
      }, delay);
    });
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
  }

  function showDuelResult(won) {
    const el = document.getElementById('duel-result');
    el.textContent = won ? 'DUEL WON' : 'DUEL LOST';
    el.className = 'duel-result ' + (won ? 'duel-result-win' : 'duel-result-loss');
    el.classList.remove('hidden');
  }

  function hideDuelResult() {
    document.getElementById('duel-result').classList.add('hidden');
  }

  return { init, showScreen };
})();

document.addEventListener('DOMContentLoaded', Game.init);
