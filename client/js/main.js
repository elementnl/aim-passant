const GAME_OVER_REASONS = {
  'checkmate': 'Checkmate!',
  'king-captured': 'The King has fallen!',
  'draw': 'The game ended in a draw.',
};

const ARENA_DESCRIPTIONS = [
  { name: 'Warehouse', desc: 'Balanced layout. Mixed cover at all ranges. Good for any weapon.' },
  { name: 'Corridors', desc: 'Tight lanes with narrow gaps. Close quarters combat. Favors shotguns.' },
  { name: 'Towers', desc: 'Elevated platforms with ramps. Vertical gameplay. Favors snipers.' },
  { name: 'Sniper Alley', desc: 'Long sightlines split by a center wall. Open flanks. Favors range.' },
];

const Game = (() => {
  let myColor = null;

  function init() {
    Audio.preload();
    Lobby.init();
    FPS.init();

    Network.on('game-start', ({ chess }) => {
      gameOverPending = false;
      myColor = Lobby.getMyColor();
      ChessUI.init(myColor);
      ChessUI.update(chess);
      showScreen('chess');
    });

    Network.on('chess-update', (state) => {
      ChessUI.update(state);
    });

    Network.on('duel-map-select', ({ attacker, defender, arenaCount }) => {
      showMapSelect(attacker, defender, arenaCount);
    });

    Network.on('duel-waiting-select', ({ attacker, defender }) => {
      document.getElementById('mapwait-info').textContent =
        `${attacker.stats.name} vs ${defender.stats.name}`;
      showScreen('mapwait');
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

    let gameOverPending = false;
    let duelEndTimeout = null;

    Network.on('duel-end', ({ winner, state }) => {
      FPS.endDuel(winner);
      Audio.play('explosion');

      const myRole = state.turn === myColor ? 'defender' : 'attacker';
      const iWon = (myRole === 'attacker' && winner === 'attacker') ||
                   (myRole === 'defender' && winner === 'defender');

      duelEndTimeout = setTimeout(() => {
        if (gameOverPending) return;
        Audio.play(iWon ? 'duelWin' : 'duelLoss');
        showDuelResult(iWon);

        setTimeout(() => {
          if (gameOverPending) return;
          hideDuelResult();
          ChessUI.update(state);
          showScreen('chess');
        }, 2500);
      }, 100);
    });

    Network.on('game-over', ({ reason, winner }) => {
      gameOverPending = true;
      if (duelEndTimeout) clearTimeout(duelEndTimeout);
      hideDuelResult();
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

  function showMapSelect(attacker, defender, arenaCount) {
    const container = document.getElementById('map-cards');
    container.innerHTML = '';

    for (let i = 0; i < arenaCount; i++) {
      const info = ARENA_DESCRIPTIONS[i] || { name: `Arena ${i + 1}`, desc: '' };
      const card = document.createElement('div');
      card.className = 'map-card';

      const preview = document.createElement('canvas');
      preview.className = 'map-card-preview';
      preview.width = 200;
      preview.height = 100;
      drawMinimap(preview, i);

      const name = document.createElement('div');
      name.className = 'map-card-name';
      name.textContent = info.name;

      const desc = document.createElement('div');
      desc.className = 'map-card-desc';
      desc.textContent = info.desc;

      card.appendChild(preview);
      card.appendChild(name);
      card.appendChild(desc);

      card.addEventListener('click', () => {
        Network.sendMapChoice(i);
      });

      container.appendChild(card);
    }

    showScreen('mapselect');
  }

  function drawMinimap(canvas, arenaIndex) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const scale = Math.min(w, h) / 44;

    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#aaa';
    ctx.fillRect(w / 2 - 20 * scale, h / 2 - 20 * scale, 40 * scale, 40 * scale);

    const layouts = getMiniMapCovers();
    const covers = layouts[arenaIndex] || [];

    covers.forEach(({ pos, size, type }) => {
      const x = w / 2 + pos[0] * scale - (size[0] * scale) / 2;
      const y = h / 2 + pos[2] * scale - (size[2] * scale) / 2;
      const cw = size[0] * scale;
      const ch = size[2] * scale;

      if (type === 'crate' || type === 'destructible') {
        ctx.fillStyle = '#8B7355';
      } else if (type === 'pillar' || type === 'ramp_base') {
        ctx.fillStyle = '#666';
      } else {
        ctx.fillStyle = '#777';
      }
      ctx.fillRect(x, y, Math.max(cw, 1), Math.max(ch, 1));
    });
  }

  function getMiniMapCovers() {
    return [
      [
        { pos: [0,0,0], size: [4,4,1.5], type: 'wall' },
        { pos: [0,0,6], size: [2,2,2], type: 'crate' },
        { pos: [0,0,-6], size: [2,2,2], type: 'crate' },
        { pos: [-8,0,8], size: [3,3,1], type: 'wall' },
        { pos: [-8,0,-8], size: [1,3,3], type: 'wall' },
        { pos: [8,0,-8], size: [3,3,1], type: 'wall' },
        { pos: [8,0,8], size: [1,3,3], type: 'wall' },
        { pos: [-14,0,0], size: [2,2,6], type: 'wall' },
        { pos: [14,0,0], size: [2,2,6], type: 'wall' },
        { pos: [0,0,14], size: [6,3,0.8], type: 'wall' },
        { pos: [0,0,-14], size: [6,3,0.8], type: 'wall' },
      ],
      [
        { pos: [-7,0,-12], size: [0.8,4,14], type: 'wall' },
        { pos: [-7,0,12], size: [0.8,4,14], type: 'wall' },
        { pos: [7,0,-12], size: [0.8,4,14], type: 'wall' },
        { pos: [7,0,12], size: [0.8,4,14], type: 'wall' },
        { pos: [-4,0,-10], size: [5,4,0.8], type: 'wall' },
        { pos: [4,0,-10], size: [5,4,0.8], type: 'wall' },
        { pos: [-4,0,10], size: [5,4,0.8], type: 'wall' },
        { pos: [4,0,10], size: [5,4,0.8], type: 'wall' },
        { pos: [0,0,0], size: [2,2,2], type: 'crate' },
      ],
      [
        { pos: [-10,0,-10], size: [4,3,4], type: 'ramp_base' },
        { pos: [10,0,10], size: [4,3,4], type: 'ramp_base' },
        { pos: [0,0,0], size: [3,5,3], type: 'pillar' },
        { pos: [-5,0,5], size: [2,2,2], type: 'crate' },
        { pos: [5,0,-5], size: [2,2,2], type: 'crate' },
        { pos: [0,0,8], size: [3,3,0.8], type: 'wall' },
        { pos: [0,0,-8], size: [3,3,0.8], type: 'wall' },
      ],
      [
        { pos: [0,0,-14], size: [1,4,10], type: 'wall' },
        { pos: [0,0,14], size: [1,4,10], type: 'wall' },
        { pos: [0,0,0], size: [1,4,8], type: 'wall' },
        { pos: [-8,0,0], size: [0.8,3,8], type: 'wall' },
        { pos: [8,0,0], size: [0.8,3,8], type: 'wall' },
        { pos: [-12,0,-5], size: [4,4,4], type: 'ramp_base' },
        { pos: [12,0,5], size: [4,4,4], type: 'ramp_base' },
      ],
    ];
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
    document.getElementById('crosshair').classList.add('hidden');
  }

  function hideDuelResult() {
    document.getElementById('duel-result').classList.add('hidden');
    document.getElementById('crosshair').classList.remove('hidden');
  }

  return { init, showScreen };
})();

document.addEventListener('DOMContentLoaded', Game.init);
