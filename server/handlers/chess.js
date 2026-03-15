const rooms = require('../rooms');
const { makeMove } = require('../game');

module.exports = function registerChessHandlers(io, socket) {
  socket.on('chess-move', ({ from, to, promotion }, callback) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room || room.state !== 'chess') return callback({ error: 'Invalid state' });

    const player = room.players.find(p => p.id === socket.id);
    const currentTurn = room.chess.turn() === 'w' ? 'white' : 'black';
    if (player.color !== currentTurn) return callback({ error: 'Not your turn' });

    const result = makeMove(room, from, to, promotion);
    if (result.error) return callback({ error: result.error });

    if (result.duel) {
      room.state = 'duel';
      room.pendingMove = result.move;
      room.duelInfo = { attacker: result.attacker, defender: result.defender };

      io.to(room.code).emit('duel-start', {
        attacker: result.attacker,
        defender: result.defender,
      });
      callback({ ok: true, duel: true });
    } else {
      io.to(room.code).emit('chess-update', result.state);
      callback({ ok: true, duel: false, state: result.state });

      if (result.state.isGameOver) {
        room.state = 'gameover';
        io.to(room.code).emit('game-over', {
          reason: result.state.isCheckmate ? 'checkmate' : 'draw',
          winner: result.state.isCheckmate ? currentTurn : null,
        });
      }
    }
  });
};
