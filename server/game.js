const { Chess } = require('chess.js');
const { PIECE_STATS } = require('../shared/pieces');

function initChessGame(room) {
  room.chess = new Chess();
  room.state = 'chess';
  room.capturedPieces = { white: [], black: [] };
  return getChessState(room);
}

function getChessState(room) {
  return {
    fen: room.chess.fen(),
    turn: room.chess.turn() === 'w' ? 'white' : 'black',
    isCheck: room.chess.isCheck(),
    isCheckmate: room.chess.isCheckmate(),
    isStalemate: room.chess.isStalemate(),
    isDraw: room.chess.isDraw(),
    isGameOver: room.chess.isGameOver(),
    capturedPieces: room.capturedPieces,
  };
}

function colorName(c) {
  return c === 'w' ? 'white' : 'black';
}

function makeMove(room, from, to, promotion) {
  const chess = room.chess;
  const targetPiece = chess.get(to);
  const movingPiece = chess.get(from);

  if (!movingPiece) return { error: 'No piece at source square' };

  const move = chess.move({ from, to, promotion: promotion || undefined });
  if (!move) return { error: 'Invalid move' };

  if (targetPiece) {
    chess.undo();
    return {
      duel: true,
      move: { from, to, promotion },
      attacker: {
        piece: movingPiece.type,
        color: colorName(movingPiece.color),
        square: from,
        stats: { ...PIECE_STATS[movingPiece.type] },
      },
      defender: {
        piece: targetPiece.type,
        color: colorName(targetPiece.color),
        square: to,
        stats: { ...PIECE_STATS[targetPiece.type] },
      },
    };
  }

  return { duel: false, move, state: getChessState(room) };
}

function resolveDuel(room, winner, pendingMove) {
  const chess = room.chess;
  const { from, to, promotion } = pendingMove;
  const attackerPiece = chess.get(from);
  const defenderPiece = chess.get(to);

  if (winner === 'attacker') {
    chess.move({ from, to, promotion: promotion || undefined });

    if (defenderPiece) {
      room.capturedPieces[colorName(defenderPiece.color)].push(defenderPiece.type);
    }

    const kingCaptured = defenderPiece && defenderPiece.type === 'k';
    return {
      winner: 'attacker',
      state: getChessState(room),
      kingCaptured,
      capturedKingColor: kingCaptured ? colorName(defenderPiece.color) : null,
    };
  }

  chess.remove(from);
  if (attackerPiece) {
    room.capturedPieces[colorName(attackerPiece.color)].push(attackerPiece.type);
  }

  const fen = chess.fen();
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  parts[4] = '0';
  if (parts[1] === 'w') parts[5] = String(parseInt(parts[5]) + 1);
  chess.load(parts.join(' '));

  const kingCaptured = attackerPiece && attackerPiece.type === 'k';
  return {
    winner: 'defender',
    state: getChessState(room),
    kingCaptured,
    capturedKingColor: kingCaptured ? colorName(attackerPiece.color) : null,
  };
}

module.exports = { initChessGame, getChessState, makeMove, resolveDuel };
