const rooms = require('../rooms');
const { makeMove } = require('../game');
const { generateSpawns, getArenaCount } = require('../spawns');

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

      const arenaIndex = Math.floor(Math.random() * getArenaCount());
      const spawns = generateSpawns(arenaIndex);

      io.to(room.key).emit('duel-start', {
        attacker: result.attacker,
        defender: result.defender,
        spawns,
        arenaIndex,
      });
      callback({ ok: true, duel: true });
    } else {
      io.to(room.key).emit('chess-update', result.state);
      callback({ ok: true, duel: false, state: result.state });

      if (result.state.isGameOver) {
        room.state = 'gameover';
        io.to(room.key).emit('game-over', {
          reason: result.state.isCheckmate ? 'checkmate' : 'draw',
          winner: result.state.isCheckmate ? currentTurn : null,
        });
      }
    }
  });
};
