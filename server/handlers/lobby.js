const rooms = require('../rooms');
const { initChessGame } = require('../game');

module.exports = function registerLobbyHandlers(io, socket) {
  socket.on('create-room', ({ name, password }, callback) => {
    const result = rooms.create(socket.id, name, password);
    if (result.error) return callback({ error: result.error });

    const room = result.room;
    socket.join(room.key);
    callback({ name: room.name });
  });

  socket.on('join-room', ({ name, password }, callback) => {
    const result = rooms.join(name, socket.id, password);
    if (result.error) return callback({ error: result.error });

    const room = result.room;
    socket.join(room.key);
    callback({ name: room.name, color: 'black' });

    io.to(room.key).emit('room-update', {
      players: room.players.length,
      state: room.state,
    });
  });

  socket.on('start-game', (callback) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (room.host !== socket.id) return callback({ error: 'Only host can start' });
    if (room.players.length < 2) return callback({ error: 'Need 2 players' });

    const chessState = initChessGame(room);
    io.to(room.key).emit('game-start', {
      chess: chessState,
      players: room.players.map(p => ({ color: p.color })),
    });
    callback({ ok: true });
  });
};
