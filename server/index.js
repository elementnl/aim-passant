const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const registerSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const chessJsSrc = fs.readFileSync(
  path.join(__dirname, '..', 'node_modules', 'chess.js', 'dist', 'cjs', 'chess.js'),
  'utf-8'
);
const chessJsWrapped = `(function(){var exports={};${chessJsSrc}\nwindow.Chess=exports.Chess;})();`;

app.get('/lib/chess.js', (_req, res) => {
  res.type('application/javascript').send(chessJsWrapped);
});

app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Aim Passant running on http://localhost:${PORT}`);
});
