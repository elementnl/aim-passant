const rooms = require('../rooms');
const { resolveDuel } = require('../game');

module.exports = function registerDuelHandlers(io, socket) {
  socket.on('duel-player-state', (data) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room || room.state !== 'duel') return;
    socket.to(room.key).emit('duel-opponent-state', data);
  });

  socket.on('duel-shoot', (data) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room || room.state !== 'duel') return;
    socket.to(room.key).emit('duel-opponent-shoot', data);
  });

  socket.on('duel-hit', ({ damage }) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room || room.state !== 'duel') return;
    socket.to(room.key).emit('duel-take-damage', { damage });
  });

  socket.on('duel-result', ({ winner }) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room || room.state !== 'duel') return;
    if (room.duelResolved) return;
    room.duelResolved = true;

    const result = resolveDuel(room, winner, room.pendingMove);
    room.state = 'chess';
    room.pendingMove = null;
    room.duelInfo = null;
    room.duelResolved = false;

    if (result.kingCaptured) {
      room.state = 'gameover';
      const winnerColor = result.capturedKingColor === 'white' ? 'black' : 'white';
      io.to(room.key).emit('duel-end', { winner, state: result.state });
      io.to(room.key).emit('game-over', { reason: 'king-captured', winner: winnerColor });
    } else {
      io.to(room.key).emit('duel-end', { winner, state: result.state });
    }
  });
};
