const ChessUI = (() => {
  let fen = null;
  let myColor = 'white';
  let selectedSquare = null;
  let validMoves = [];
  let isMyTurn = false;
  let pieceHP = {};
  let lastMoveFrom = null;
  let lastMoveTo = null;

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
    pieceHP = chessState.pieceHP || {};
    if (chessState.lastMove) {
      lastMoveFrom = chessState.lastMove.from;
      lastMoveTo = chessState.lastMove.to;
    }
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
      const legalMoves = chess.moves({ square, verbose: true }).map(m => m.to);

      const piece = chess.get(square);
      if (!piece) return legalMoves;

      const allSquares = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          allSquares.push(String.fromCharCode(97 + c) + (r + 1));
        }
      }

      const extraMoves = [];
      for (const target of allSquares) {
        if (legalMoves.includes(target)) continue;
        try {
          const testChess = new Chess(fen);
          const m = testChess.move({ from: square, to: target, promotion: 'q' });
          if (m) extraMoves.push(target);
        } catch {
          try {
            const fenParts = fen.split(' ');
            fenParts[1] = piece.color;
            const modFen = fenParts.join(' ');
            const testChess2 = new Chess(modFen);
            const m2 = testChess2.move({ from: square, to: target, promotion: 'q' });
            if (m2) extraMoves.push(target);
          } catch {}
        }
      }

      return [...new Set([...legalMoves, ...extraMoves])];
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

          const hp = pieceHP[square];
          const maxHP = PIECE_STATS[cell.piece]?.hp;
          if (hp !== undefined && maxHP && hp < maxHP) {
            const pct = Math.max(0, hp / maxHP);
            const bar = document.createElement('div');
            bar.className = 'piece-hp-bar';
            const fill = document.createElement('div');
            fill.className = 'piece-hp-fill';
            fill.style.width = (pct * 100) + '%';
            if (pct > 0.6) fill.style.background = '#2ecc71';
            else if (pct > 0.3) fill.style.background = '#e9a545';
            else fill.style.background = '#e74c3c';
            bar.appendChild(fill);
            el.appendChild(bar);
          }
        }

        if (square === lastMoveFrom || square === lastMoveTo) el.classList.add('last-move');
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
        promotion = await showPromotionPicker();
        if (!promotion) { renderBoard(); return; }
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

  function showPromotionPicker() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);' +
        'display:flex;align-items:center;justify-content:center;z-index:100;';

      const box = document.createElement('div');
      box.style.cssText =
        'background:#111;border:1px solid #333;padding:1rem 1.5rem;text-align:center;';

      const label = document.createElement('div');
      label.textContent = 'Promote to:';
      label.style.cssText = 'color:#888;font-size:0.8rem;margin-bottom:0.75rem;letter-spacing:1px;';
      box.appendChild(label);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:0.5rem;';

      const options = [
        { piece: 'q', char: '\u265B', name: 'Queen' },
        { piece: 'r', char: '\u265C', name: 'Rook' },
        { piece: 'b', char: '\u265D', name: 'Bishop' },
        { piece: 'n', char: '\u265E', name: 'Knight' },
      ];

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt.char;
        btn.title = opt.name;
        btn.style.cssText =
          'font-size:2rem;width:3rem;height:3rem;background:rgba(255,255,255,0.08);' +
          'border:1px solid #444;color:#fff;cursor:pointer;display:flex;align-items:center;' +
          'justify-content:center;font-family:inherit;';
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.2)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.08)'; });
        btn.addEventListener('click', () => {
          overlay.remove();
          resolve(opt.piece);
        });
        row.appendChild(btn);
      });

      box.appendChild(row);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  function updateTurnIndicator(state) {
    const el = document.getElementById('turn-indicator');
    if (state.isCheck) {
      el.textContent = `${state.turn.toUpperCase()}'s turn — CHECK!`;
      el.style.color = '#c0392b';
    } else {
      el.textContent = `${state.turn.toUpperCase()}'s turn`;
      el.style.color = isMyTurn ? '#fff' : '#666';
    }
  }

  function updateCapturedPieces(captured) {
    const topEl = document.getElementById('captured-white');
    const botEl = document.getElementById('captured-black');
    if (myColor === 'white') {
      topEl.textContent = captured.white.map(p => PIECE_CHARS[p]).join(' ');
      botEl.textContent = captured.black.map(p => PIECE_CHARS[p]).join(' ');
    } else {
      topEl.textContent = captured.black.map(p => PIECE_CHARS[p]).join(' ');
      botEl.textContent = captured.white.map(p => PIECE_CHARS[p]).join(' ');
    }
  }

  return { init, update };
})();
