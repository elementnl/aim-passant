const Lobby = (() => {
  let isHost = false;
  let roomName = null;
  let myColor = 'white';

  function init() {
    const createOptions = document.getElementById('create-options');
    const joinOptions = document.getElementById('join-options');
    const lobbyError = document.getElementById('lobby-error');

    const btnCreate = document.getElementById('btn-create');
    const btnJoin = document.getElementById('btn-join');

    btnCreate.addEventListener('click', () => {
      const showing = !createOptions.classList.contains('hidden');
      createOptions.classList.toggle('hidden');
      joinOptions.classList.add('hidden');
      lobbyError.classList.add('hidden');
      btnCreate.classList.toggle('active', !showing);
      btnJoin.classList.remove('active');
    });

    btnJoin.addEventListener('click', () => {
      const showing = !joinOptions.classList.contains('hidden');
      joinOptions.classList.toggle('hidden');
      createOptions.classList.add('hidden');
      lobbyError.classList.add('hidden');
      btnJoin.classList.toggle('active', !showing);
      btnCreate.classList.remove('active');
    });

    document.getElementById('btn-create-confirm').addEventListener('click', async () => {
      const name = document.getElementById('input-room-name-create').value.trim();
      const password = document.getElementById('input-password-create').value;
      if (!name) return showError('Enter a lobby name');
      try {
        const result = await Network.createRoom(name, password || null);
        roomName = result.name;
        isHost = true;
        myColor = 'white';
        showWaitingRoom();
      } catch (err) {
        showError(err.message);
      }
    });

    document.getElementById('btn-join-confirm').addEventListener('click', async () => {
      const name = document.getElementById('input-room-name-join').value.trim();
      const password = document.getElementById('input-password-join').value;
      if (!name) return showError('Enter a lobby name');
      try {
        const result = await Network.joinRoom(name, password || null);
        roomName = result.name;
        isHost = false;
        myColor = result.color;
        showWaitingRoom();
      } catch (err) {
        showError(err.message);
      }
    });

    document.getElementById('btn-start').addEventListener('click', async () => {
      try { await Network.startGame(); }
      catch (err) { showError(err.message); }
    });

    document.getElementById('btn-back-lobby').addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('btn-chess-leave').addEventListener('click', () => {
      if (confirm('Leave the match?')) window.location.reload();
    });

    document.getElementById('btn-playground').addEventListener('click', () => {
      LobbyBG.stop();
      Playground.start();
    });

    document.getElementById('btn-howtoplay').addEventListener('click', () => {
      buildPieceGuide();
      document.getElementById('howtoplay-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-howtoplay').addEventListener('click', () => {
      document.getElementById('howtoplay-modal').classList.add('hidden');
    });

    document.getElementById('howtoplay-modal').querySelector('.modal-backdrop').addEventListener('click', () => {
      document.getElementById('howtoplay-modal').classList.add('hidden');
    });

    initSettings();

    Network.on('room-update', ({ players }) => {
      if (players >= 2) {
        document.getElementById('waiting-status').textContent = 'Opponent connected!';
        if (isHost) document.getElementById('btn-start').classList.remove('hidden');
      }
    });

    Network.on('opponent-disconnected', () => {
      Game.showScreen('gameover');
      document.getElementById('gameover-title').textContent = 'OPPONENT LEFT';
      document.getElementById('gameover-reason').textContent = 'Your opponent disconnected.';
    });
  }

  function initSettings() {
    const modal = document.getElementById('settings-modal');
    const backdrop = modal.querySelector('.modal-backdrop');

    document.getElementById('btn-open-settings').addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    backdrop.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    document.getElementById('btn-apply-settings').addEventListener('click', () => {
      const isPG = document.getElementById('screen-playground')?.classList.contains('active');
      const isDuel = document.getElementById('screen-duel')?.classList.contains('active');

      if (isPG || isDuel) {
        const canvas = isPG
          ? document.getElementById('playground-canvas')
          : document.getElementById('duel-canvas');

        const oldGunType = FPSGun.isReloading() ? null : true;
        FPSGun.destroy();

        FPSRenderer.init(canvas);
        const arenaIdx = FPSArena.getLayoutIndex();
        FPSArena.build(FPSRenderer.getScene(), arenaIdx);

        const weaponType = isPG ? Playground.getWeaponType() : FPS.getWeaponType();
        FPSGun.create(FPSRenderer.getCamera(), weaponType);

        if (isPG) {
          Playground.respawnDummy();
        } else if (isDuel) {
          const opPiece = FPS.getOpponentPiece();
          const isAttacker = FPS.getMyRole() === 'attacker';
          FPSOpponent.create(FPSRenderer.getScene(), isAttacker, opPiece);
        }
      }

      modal.classList.add('hidden');
    });

    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.querySelectorAll('.setting-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        let val = btn.dataset.value;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        Settings.set(btn.dataset.setting, val);
        btn.parentElement.querySelectorAll('.setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        FPSRenderer.applySettings();
        if (Auth.isLoggedIn()) Auth.saveSettings();
      });
    });

    ['shadows', 'antialiasing', 'textures', 'particles'].forEach(key => {
      const current = Settings.get(key);
      document.querySelectorAll(`.setting-btn[data-setting="${key}"]`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === String(current));
      });
    });

    const sliders = {
      masterVolume: { display: v => Math.round(v) + '%', toSetting: v => v / 100 },
      musicVolume:  { display: v => Math.round(v) + '%', toSetting: v => v / 100 },
      sfxVolume:    { display: v => Math.round(v) + '%', toSetting: v => v / 100 },
      sensitivity:  { display: v => (v / 100).toFixed(2), toSetting: v => v / 100 },
      scopedSensitivity: { display: v => (v / 100).toFixed(2), toSetting: v => v / 100 },
      renderScale:  { display: v => Math.round(v) + '%', toSetting: v => v / 100 },
    };

    for (const [key, config] of Object.entries(sliders)) {
      const slider = document.getElementById('slider-' + key);
      const valEl = document.getElementById('val-' + key);
      if (!slider) continue;

      const saved = Settings.get(key);
      slider.value = Math.round(saved * 100);
      valEl.textContent = config.display(slider.value);

      slider.addEventListener('input', () => {
        valEl.textContent = config.display(slider.value);
        Settings.set(key, config.toSetting(parseFloat(slider.value)));
        applyLiveSettings();
        if (key === 'renderScale') FPSRenderer.applySettings();
      });
    }
  }

  function applyLiveSettings() {
    Audio.setMasterVolume(Settings.get('masterVolume'));
    Audio.updateMusicVolume();
    FPSRenderer.applySettings();
    if (Auth.isLoggedIn()) Auth.saveSettings();
  }

  function showWaitingRoom() {
    Game.showScreen('waiting');
    document.getElementById('room-display-name').textContent = roomName;
    document.getElementById('player-color').textContent = `You are playing as ${myColor}`;
    document.getElementById('waiting-status').textContent =
      isHost ? 'Waiting for opponent...' : 'Opponent connected!';
  }

  function showError(msg) {
    const el = document.getElementById('lobby-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function buildPieceGuide() {
    const container = document.getElementById('piece-guide');
    if (container.children.length > 0) return;

    const pieces = [
      {
        icon: '\u265F', name: 'Pawn', weapon: 'Semi-Auto Pistol',
        hp: 150, speed: 'Fast', jump: 'Low',
        passive: 'Slow health regeneration over time.',
        ult: 'Flashbang — blinds the opponent for 2 seconds after a 1-second pin pull.',
      },
      {
        icon: '\u265E', name: 'Knight', weapon: 'Charged Bow',
        hp: 200, speed: 'Fast', jump: 'Very High (Double Jump)',
        passive: 'Double jump — press space mid-air for a second jump.',
        ult: 'Explosive Arrow — fires a homing arrow that deals 150 damage on impact with area explosion. No charge needed.',
      },
      {
        icon: '\u265D', name: 'Bishop', weapon: 'Pump Shotgun',
        hp: 275, speed: 'Medium', jump: 'Medium',
        passive: 'Resurrects once at 40 HP when killed. The fight continues.',
        ult: 'Soul Pull — drags the opponent toward you for 3 seconds. They cannot move but can shoot. Breaks wooden crates.',
      },
      {
        icon: '\u265C', name: 'Rook', weapon: 'Bolt-Action Sniper',
        hp: 350, speed: 'Medium', jump: 'Medium',
        passive: 'Immune to first headshot OR first 2 body shots.',
        ult: 'Freeze — freezes the opponent for 2.5 seconds. They cannot move or look but can shoot forward.',
      },
      {
        icon: '\u265B', name: 'Queen', weapon: 'Full-Auto AR',
        hp: 425, speed: 'Slow', jump: 'Low-Medium',
        passive: 'Wallhack pulse every 10 seconds — sees opponent through walls for 1 second.',
        ult: 'Ring of Fire — expanding ring of fire deals 210 damage. Blocked by walls. Jump on platforms to avoid.',
      },
      {
        icon: '\u265A', name: 'King', weapon: 'Minigun',
        hp: 500, speed: 'Slow', jump: 'Low-Medium',
        passive: 'Forcefield activates every 15 seconds for 3 seconds, blocking all damage.',
        ult: 'Airstrike — calls a bomb on the opponent\'s position. 180 max damage in 8-unit radius. Can damage yourself.',
      },
    ];

    pieces.forEach(p => {
      const card = document.createElement('div');
      card.className = 'piece-card';
      card.innerHTML = `
        <div class="piece-card-header">
          <span class="piece-card-icon">${p.icon}</span>
          <div>
            <div class="piece-card-title">${p.name}</div>
            <div class="piece-card-weapon">${p.weapon}</div>
          </div>
        </div>
        <div class="piece-card-stats">
          <div class="piece-card-stat"><span class="piece-card-stat-label">HP</span> <span class="piece-card-stat-val">${p.hp}</span></div>
          <div class="piece-card-stat"><span class="piece-card-stat-label">Speed</span> <span class="piece-card-stat-val">${p.speed}</span></div>
          <div class="piece-card-stat"><span class="piece-card-stat-label">Jump</span> <span class="piece-card-stat-val">${p.jump}</span></div>
        </div>
        <div class="piece-card-abilities">
          <div class="piece-card-ability"><strong>Passive:</strong> ${p.passive}</div>
          <div class="piece-card-ability"><strong>Ultimate (Q):</strong> ${p.ult}</div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function getMyColor() { return myColor; }

  function refreshSettingsUI() {
    ['shadows', 'antialiasing', 'textures', 'particles'].forEach(key => {
      const current = Settings.get(key);
      document.querySelectorAll(`.setting-btn[data-setting="${key}"]`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === String(current));
      });
    });

    const sliderConfigs = {
      masterVolume: v => Math.round(v) + '%',
      musicVolume: v => Math.round(v) + '%',
      sfxVolume: v => Math.round(v) + '%',
      sensitivity: v => (v).toFixed(2),
      scopedSensitivity: v => (v).toFixed(2),
      renderScale: v => Math.round(v) + '%',
    };

    for (const [key, display] of Object.entries(sliderConfigs)) {
      const slider = document.getElementById('slider-' + key);
      const valEl = document.getElementById('val-' + key);
      if (!slider || !valEl) continue;
      const saved = Settings.get(key);
      if (saved === undefined || saved === null) continue;
      slider.value = Math.round(saved * 100);
      valEl.textContent = display(saved);
    }
  }

  return { init, getMyColor, refreshSettingsUI };
})();
