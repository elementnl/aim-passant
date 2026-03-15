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

      const attackerPlayer = room.players.find(p => p.color === result.attacker.color);
      const defenderPlayer = room.players.find(p => p.color === result.defender.color);

      if (attackerPlayer) {
        io.to(attackerPlayer.id).emit('duel-map-select', {
          attacker: result.attacker,
          defender: result.defender,
          arenaCount: getArenaCount(),
        });
      }
      if (defenderPlayer) {
        io.to(defenderPlayer.id).emit('duel-waiting-select', {
          attacker: result.attacker,
          defender: result.defender,
        });
      }

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

  socket.on('duel-map-chosen', ({ arenaIndex }) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room || room.state !== 'duel' || !room.duelInfo) return;

    const safeIndex = Math.max(0, Math.min(arenaIndex, getArenaCount() - 1));
    const spawns = generateSpawns(safeIndex);

    io.to(room.key).emit('duel-start', {
      attacker: room.duelInfo.attacker,
      defender: room.duelInfo.defender,
      spawns,
      arenaIndex: safeIndex,
    });
  });
};
