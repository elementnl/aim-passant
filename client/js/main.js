const GAME_OVER_REASONS = {
  'checkmate': 'Checkmate!',
  'king-captured': 'The King has fallen!',
  'draw': 'The game ended in a draw.',
};

const Game = (() => {
  let myColor = null;

  function init() {
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

    Network.on('duel-start', ({ attacker, defender }) => {
      document.getElementById('duel-attacker').textContent =
        `${attacker.stats.name} (${attacker.color})`;
      document.getElementById('duel-defender').textContent =
        `${defender.stats.name} (${defender.color})`;

      showScreen('duel');

      FPS.startDuel({
        myRole: attacker.color === myColor ? 'attacker' : 'defender',
        attacker,
        defender,
      });
    });

    Network.on('duel-end', ({ winner, state }) => {
      FPS.endDuel();
      setTimeout(() => {
        ChessUI.update(state);
        showScreen('chess');
      }, 1500);
    });

    Network.on('game-over', ({ reason, winner }) => {
      const delay = FPS.isActive() ? 2000 : 500;
      setTimeout(() => {
        FPS.endDuel();
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

  return { init, showScreen };
})();

document.addEventListener('DOMContentLoaded', Game.init);
