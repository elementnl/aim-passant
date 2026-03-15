const ChessUI = (() => {
  let fen = null;
  let myColor = 'white';
  let selectedSquare = null;
  let validMoves = [];
  let isMyTurn = false;

  const PIECE_CHARS = {
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
  };

  function init(color) {
    myColor = color;
    renderBoard();
  }

  function update(chessState) {
    const hadFen = fen !== null;
    fen = chessState.fen;
    isMyTurn = chessState.turn === myColor;
    selectedSquare = null;
    validMoves = [];
    renderBoard();
    updateTurnIndicator(chessState);
    updateCapturedPieces(chessState.capturedPieces);
    if (hadFen) Audio.play('chessMove');
  }

  function parseFEN(fenStr) {
    const board = [];
    const rows = fenStr.split(' ')[0].split('/');
    for (const row of rows) {
      const boardRow = [];
      for (const ch of row) {
        if (ch >= '1' && ch <= '8') {
          for (let i = 0; i < parseInt(ch); i++) boardRow.push(null);
        } else {
          boardRow.push({
            color: ch === ch.toUpperCase() ? 'w' : 'b',
            piece: ch.toLowerCase(),
          });
        }
      }
      board.push(boardRow);
    }
    return board;
  }

  function toAlgebraic(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  function getMovesFrom(square) {
    try {
      const chess = new Chess(fen);
      return chess.moves({ square, verbose: true }).map(m => m.to);
    } catch { return []; }
  }

  function renderBoard() {
    const boardEl = document.getElementById('chess-board');
    boardEl.innerHTML = '';
    if (!fen) return;

    const board = parseFEN(fen);
    const flipped = myColor === 'black';

    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const row = flipped ? 7 - dr : dr;
        const col = flipped ? 7 - dc : dc;
        const square = toAlgebraic(row, col);

        const el = document.createElement('div');
        el.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;

        const cell = board[row][col];
        if (cell) {
          const span = document.createElement('span');
          span.textContent = PIECE_CHARS[cell.piece];
          span.className = cell.color === 'w' ? 'piece-white' : 'piece-black';
          el.appendChild(span);
        }

        if (selectedSquare === square) el.classList.add('selected');
        if (validMoves.includes(square)) {
          el.classList.add(cell ? 'valid-capture' : 'valid-move');
        }

        el.addEventListener('click', () => onSquareClick(square, board, row, col));
        boardEl.appendChild(el);
      }
    }
  }

  function onSquareClick(square, board, row, col) {
    if (!isMyTurn) return;
    const cell = board[row][col];

    if (selectedSquare && validMoves.includes(square)) {
      makeMove(selectedSquare, square);
      return;
    }

    const isOwnPiece = cell && (
      (cell.color === 'w' && myColor === 'white') ||
      (cell.color === 'b' && myColor === 'black')
    );

    if (isOwnPiece) {
      selectedSquare = square;
      validMoves = getMovesFrom(square);
    } else {
      selectedSquare = null;
      validMoves = [];
    }
    renderBoard();
  }

  async function makeMove(from, to) {
    let promotion = null;
    const board = parseFEN(fen);
    const fromRow = 8 - parseInt(from[1]);
    const fromCol = from.charCodeAt(0) - 97;
    const cell = board[fromRow][fromCol];

    if (cell && cell.piece === 'p') {
      const toRow = parseInt(to[1]);
      if ((cell.color === 'w' && toRow === 8) || (cell.color === 'b' && toRow === 1)) {
        promotion = 'q';
      }
    }

    try {
      const result = await Network.sendChessMove(from, to, promotion);
      if (!result.duel && result.state) update(result.state);
    } catch {
      selectedSquare = null;
      validMoves = [];
      renderBoard();
    }
  }

  function updateTurnIndicator(state) {
    const el = document.getElementById('turn-indicator');
    if (state.isCheck) {
      el.textContent = `${state.turn.toUpperCase()}'s turn — CHECK!`;
      el.style.color = '#c0392b';
    } else {
      el.textContent = `${state.turn.toUpperCase()}'s turn`;
      el.style.color = isMyTurn ? '#222' : '#999';
    }
  }

  function updateCapturedPieces(captured) {
    document.getElementById('captured-white').textContent =
      captured.white.map(p => PIECE_CHARS[p]).join(' ');
    document.getElementById('captured-black').textContent =
      captured.black.map(p => PIECE_CHARS[p]).join(' ');
  }

  return { init, update };
})();
