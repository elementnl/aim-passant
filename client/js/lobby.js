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
    FPSRenderer.applySettings();
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

  function getMyColor() { return myColor; }

  return { init, getMyColor };
})();
