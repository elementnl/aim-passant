const Network = (() => {
  const socket = io();
  const listeners = {};

  function on(event, callback) {
    socket.on(event, callback);
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event) {
    if (listeners[event]) {
      listeners[event].forEach(cb => socket.off(event, cb));
      delete listeners[event];
    }
  }

  function request(event, data) {
    return new Promise((resolve, reject) => {
      socket.emit(event, data, (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  }

  function createRoom(name, password) {
    return request('create-room', { name, password });
  }

  function joinRoom(name, password) {
    return request('join-room', { name, password });
  }

  function startGame() {
    return new Promise((resolve, reject) => {
      socket.emit('start-game', (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  }

  function sendChessMove(from, to, promotion) {
    return request('chess-move', { from, to, promotion });
  }

  function sendDuelState(data) {
    socket.volatile.emit('duel-player-state', data);
  }

  function sendDuelShoot(data) {
    socket.emit('duel-shoot', data);
  }

  function sendDuelHit(damage, headshot) {
    socket.emit('duel-hit', { damage, headshot: !!headshot });
  }

  function sendDuelResult(winner) {
    socket.emit('duel-result', { winner });
  }

  return {
    on, off,
    createRoom, joinRoom, startGame,
    sendChessMove, sendDuelState, sendDuelShoot, sendDuelHit, sendDuelResult,
  };
})();
