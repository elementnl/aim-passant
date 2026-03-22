const GAME_OVER_REASONS = {
  'checkmate': 'Checkmate!',
  'king-captured': 'The King has fallen!',
  'draw': 'The game ended in a draw.',
};

const ARENA_DESCRIPTIONS = [
  { name: 'Warehouse', desc: 'Balanced layout with tall ceiling. Mixed cover at all ranges.' },
  { name: 'Bunker', desc: 'Small indoor map with low ceiling and tight hallways. Close quarters.' },
  { name: 'Outpost', desc: 'Large open outdoor map. Long sightlines. Favors snipers and range.' },
  { name: 'Factory', desc: 'Medium map with elevated platforms and vertical gameplay.' },
];

const Game = (() => {
  let myColor = null;

  async function init() {
    Audio.preload();
    LobbyBG.init('login-bg-canvas');
    document.addEventListener('click', () => { Audio.playMusic('lobby'); }, { once: true });

    document.addEventListener('click', (e) => {
      const el = e.target.closest('button, .lobby-btn, .setting-btn, .map-card, .modal-tab');
      if (el) Audio.play('uiClick');
    });

    await Auth.init();

    initLogin();

    if (Auth.isLoggedIn()) {
      await Auth.loadSettings();
      enterLobby();
    }

    Lobby.init();
    FPS.init();

    Network.on('game-start', ({ chess }) => {
      gameOverPending = false;
      LobbyBG.stop();
      Audio.stopMusic();
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
        { pos: [-8,0,8], size: [3,3,1], type: 'wall' },
        { pos: [8,0,-8], size: [3,3,1], type: 'wall' },
        { pos: [-14,0,0], size: [2,2,6], type: 'wall' },
        { pos: [14,0,0], size: [2,2,6], type: 'wall' },
        { pos: [0,0,14], size: [6,3,0.8], type: 'wall' },
        { pos: [0,0,-14], size: [6,3,0.8], type: 'wall' },
      ],
      [
        { pos: [-5,0,0], size: [0.5,2.5,8], type: 'wall' },
        { pos: [5,0,0], size: [0.5,2.5,8], type: 'wall' },
        { pos: [0,0,-5], size: [4,2.5,0.5], type: 'wall' },
        { pos: [0,0,5], size: [4,2.5,0.5], type: 'wall' },
        { pos: [-9,0,0], size: [1.5,2.5,0.5], type: 'wall' },
        { pos: [9,0,0], size: [1.5,2.5,0.5], type: 'wall' },
      ],
      [
        { pos: [0,0,0], size: [3,4,3], type: 'pillar' },
        { pos: [-15,0,15], size: [4,3,4], type: 'ramp_base' },
        { pos: [15,0,-15], size: [4,3,4], type: 'ramp_base' },
        { pos: [-20,0,0], size: [3,3,1], type: 'wall' },
        { pos: [20,0,0], size: [1,3,3], type: 'wall' },
        { pos: [0,0,20], size: [3,3,1], type: 'wall' },
        { pos: [0,0,-20], size: [1,3,3], type: 'wall' },
      ],
      [
        { pos: [-10,0,-10], size: [4,4,4], type: 'ramp_base' },
        { pos: [10,0,10], size: [4,4,4], type: 'ramp_base' },
        { pos: [0,0,0], size: [6,4,0.8], type: 'wall' },
        { pos: [-6,0,6], size: [0.8,3,6], type: 'wall' },
        { pos: [6,0,-6], size: [0.8,3,6], type: 'wall' },
        { pos: [0,0,14], size: [6,3,0.8], type: 'wall' },
        { pos: [0,0,-14], size: [6,3,0.8], type: 'wall' },
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

  function initLogin() {
    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      errorEl.classList.add('hidden');

      if (!email || !password) {
        errorEl.textContent = 'Enter email and password';
        errorEl.classList.remove('hidden');
        return;
      }

      try {
        document.getElementById('btn-login').textContent = 'Logging in...';
        await Auth.login(email, password);
        enterLobby();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
        document.getElementById('btn-login').textContent = 'Log In';
      }
    });

    document.getElementById('login-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });
  }

  function enterLobby() {
    document.getElementById('lobby-username').textContent = Auth.getUsername();
    LobbyBG.stop();
    showScreen('lobby');
    LobbyBG.init('lobby-bg-canvas');
    Audio.playMusic('lobby');
    initFriends();
  }

  function initFriends() {
    const modal = document.getElementById('friends-modal');

    document.getElementById('btn-friends').onclick = () => {
      modal.classList.remove('hidden');
      loadFriendList();
    };

    document.getElementById('btn-close-friends').onclick = () => {
      modal.classList.add('hidden');
    };

    modal.querySelector('.modal-backdrop').onclick = () => {
      modal.classList.add('hidden');
    };

    document.getElementById('btn-logout').onclick = async () => {
      await Auth.logout();
      Audio.stopMusic();
      LobbyBG.stop();
      showScreen('login');
      LobbyBG.init('login-bg-canvas');
      Audio.playMusic('lobby');
    };

    document.getElementById('btn-friend-search').onclick = async () => {
      const query = document.getElementById('friend-search').value.trim();
      const resultsEl = document.getElementById('friend-search-results');
      resultsEl.innerHTML = '';
      if (!query) return;

      const results = await Auth.searchUsers(query);
      if (results.length === 0) {
        resultsEl.innerHTML = '<div style="color:#666;font-size:0.8rem;">No users found</div>';
        return;
      }

      results.forEach(user => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.innerHTML = `
          <span class="friend-name">${user.username}</span>
          <button class="friend-action friend-action-add">Add</button>
        `;
        item.querySelector('button').onclick = async () => {
          try {
            await Auth.addFriend(user.id);
            item.querySelector('button').textContent = 'Added';
            item.querySelector('button').disabled = true;
            loadFriendList();
          } catch (err) {
            item.querySelector('button').textContent = 'Error';
          }
        };
        resultsEl.appendChild(item);
      });
    };
  }

  async function loadFriendList() {
    const listEl = document.getElementById('friend-list');
    listEl.innerHTML = '<div style="color:#666;font-size:0.8rem;">Loading...</div>';

    const friends = await Auth.getFriends();
    listEl.innerHTML = '';

    if (friends.length === 0) {
      listEl.innerHTML = '<div style="color:#666;font-size:0.8rem;">No friends yet</div>';
      return;
    }

    friends.forEach(friend => {
      const item = document.createElement('div');
      item.className = 'friend-item';
      item.innerHTML = `
        <span class="friend-name">${friend.username}</span>
        <button class="friend-action friend-action-remove">Remove</button>
      `;
      item.querySelector('button').onclick = async () => {
        await Auth.removeFriend(friend.id);
        loadFriendList();
      };
      listEl.appendChild(item);
    });
  }

  return { init, showScreen };
})();

document.addEventListener('DOMContentLoaded', Game.init);
