const rooms = require('./rooms');
const registerLobbyHandlers = require('./handlers/lobby');
const registerChessHandlers = require('./handlers/chess');
const registerDuelHandlers = require('./handlers/duel');

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    registerLobbyHandlers(io, socket);
    registerChessHandlers(io, socket);
    registerDuelHandlers(io, socket);

    socket.on('disconnect', () => {
      const result = rooms.removePlayer(socket.id);
      if (result && !result.empty) {
        io.to(result.room.key).emit('opponent-disconnected');
        result.room.state = 'gameover';
      }
    });
  });
};
