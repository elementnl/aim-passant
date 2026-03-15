const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const registerSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/lib/chess.js', (_req, res) => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'node_modules', 'chess.js', 'dist', 'cjs', 'chess.js'),
    'utf-8'
  );
  const wrapped = `(function(){var exports={};${src}\nwindow.Chess=exports.Chess;})();`;
  res.type('application/javascript').send(wrapped);
});

app.get('/shared/pieces.js', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'shared', 'pieces.js'));
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Aim Passant running on http://localhost:${PORT}`);
});
