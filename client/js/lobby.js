const Lobby = (() => {
  let isHost = false;
  let roomName = null;
  let myColor = 'white';

  function init() {
    const createOptions = document.getElementById('create-options');
    const joinOptions = document.getElementById('join-options');
    const lobbyError = document.getElementById('lobby-error');

    document.getElementById('btn-create').addEventListener('click', () => {
      createOptions.classList.toggle('hidden');
      joinOptions.classList.add('hidden');
      lobbyError.classList.add('hidden');
    });

    document.getElementById('btn-join').addEventListener('click', () => {
      joinOptions.classList.toggle('hidden');
      createOptions.classList.add('hidden');
      lobbyError.classList.add('hidden');
    });

    document.getElementById('btn-create-confirm').addEventListener('click', async () => {
      const name = document.getElementById('input-room-name-create').value.trim();
      const password = document.getElementById('input-password-create').value;
      if (!name) return showError('Enter a room name');
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
      if (!name) return showError('Enter a room name');
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
