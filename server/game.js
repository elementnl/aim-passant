const { Chess } = require('chess.js');
const { PIECE_STATS } = require('../shared/pieces');

function initChessGame(room) {
  room.chess = new Chess();
  room.state = 'chess';
  room.capturedPieces = { white: [], black: [] };
  room.pieceHP = initPieceHP(room.chess);
  return getChessState(room);
}

function initPieceHP(chess) {
  const hp = {};
  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      squares.push(String.fromCharCode(97 + c) + (r + 1));
    }
  }
  for (const sq of squares) {
    const piece = chess.get(sq);
    if (piece) {
      hp[sq] = PIECE_STATS[piece.type].hp;
    }
  }
  return hp;
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
    pieceHP: room.pieceHP,
  };
}

function colorName(c) {
  return c === 'w' ? 'white' : 'black';
}

function makeMove(room, from, to, promotion) {
  const chess = room.chess;
  const movingPiece = chess.get(from);

  if (!movingPiece) return { error: 'No piece at source square' };

  const move = chess.move({ from, to, promotion: promotion || undefined });
  if (!move) return { error: 'Invalid move' };

  if (move.captured) {
    const capturedType = move.captured;
    const capturedColor = movingPiece.color === 'w' ? 'b' : 'w';
    chess.undo();

    const attackerHP = room.pieceHP[from] || PIECE_STATS[movingPiece.type].hp;
    const defenderHP = room.pieceHP[to] || PIECE_STATS[capturedType].hp;

    return {
      duel: true,
      move: { from, to, promotion },
      attacker: {
        piece: movingPiece.type,
        color: colorName(movingPiece.color),
        square: from,
        stats: { ...PIECE_STATS[movingPiece.type] },
        currentHP: attackerHP,
      },
      defender: {
        piece: capturedType,
        color: colorName(capturedColor),
        square: to,
        stats: { ...PIECE_STATS[capturedType] },
        currentHP: defenderHP,
      },
    };
  }

  room.pieceHP[to] = room.pieceHP[from];
  delete room.pieceHP[from];

  if (move.flags.includes('k')) {
    const rank = move.color === 'w' ? '1' : '8';
    room.pieceHP['f' + rank] = room.pieceHP['h' + rank];
    delete room.pieceHP['h' + rank];
  } else if (move.flags.includes('q')) {
    const rank = move.color === 'w' ? '1' : '8';
    room.pieceHP['d' + rank] = room.pieceHP['a' + rank];
    delete room.pieceHP['a' + rank];
  }

  return { duel: false, move, state: getChessState(room) };
}

function resolveDuel(room, winner, pendingMove, winnerHP) {
  const chess = room.chess;
  const { from, to, promotion } = pendingMove;
  const attackerPiece = chess.get(from);
  const defenderPiece = chess.get(to);

  if (winner === 'attacker') {
    const kingCaptured = defenderPiece && defenderPiece.type === 'k';

    if (kingCaptured) {
      if (defenderPiece) {
        room.capturedPieces[colorName(defenderPiece.color)].push(defenderPiece.type);
      }
      delete room.pieceHP[to];
      room.pieceHP[to] = winnerHP;
      return {
        winner: 'attacker',
        state: { fen: chess.fen(), turn: colorName(chess.turn()), capturedPieces: room.capturedPieces, pieceHP: room.pieceHP },
        kingCaptured: true,
        capturedKingColor: colorName(defenderPiece.color),
      };
    }

    chess.move({ from, to, promotion: promotion || undefined });
    if (defenderPiece) {
      room.capturedPieces[colorName(defenderPiece.color)].push(defenderPiece.type);
    }
    delete room.pieceHP[from];
    room.pieceHP[to] = winnerHP;

    return {
      winner: 'attacker',
      state: getChessState(room),
      kingCaptured: false,
      capturedKingColor: null,
    };
  }

  const kingCaptured = attackerPiece && attackerPiece.type === 'k';

  if (kingCaptured) {
    if (attackerPiece) {
      room.capturedPieces[colorName(attackerPiece.color)].push(attackerPiece.type);
    }
    delete room.pieceHP[from];
    room.pieceHP[to] = winnerHP;
    return {
      winner: 'defender',
      state: { fen: chess.fen(), turn: colorName(chess.turn()), capturedPieces: room.capturedPieces, pieceHP: room.pieceHP },
      kingCaptured: true,
      capturedKingColor: colorName(attackerPiece.color),
    };
  }

  chess.remove(from);
  if (attackerPiece) {
    room.capturedPieces[colorName(attackerPiece.color)].push(attackerPiece.type);
  }
  delete room.pieceHP[from];
  room.pieceHP[to] = winnerHP;

  const fen = chess.fen();
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  parts[4] = '0';
  if (parts[1] === 'w') parts[5] = String(parseInt(parts[5]) + 1);
  chess.load(parts.join(' '));

  return {
    winner: 'defender',
    state: getChessState(room),
    kingCaptured: false,
    capturedKingColor: null,
  };
}

module.exports = { initChessGame, getChessState, makeMove, resolveDuel };
