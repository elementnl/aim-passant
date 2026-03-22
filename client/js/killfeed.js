const KillFeed = (() => {
  let myUsername = '';
  let opponentUsername = '';
  let containerEl = null;
  const MAX_ENTRIES = 5;

  const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
  const WEAPON_NAMES = {
    pistol: 'Pistol', bow: 'Bow', shotgun: 'Shotgun',
    sniper: 'Sniper', ar: 'AR', minigun: 'Minigun',
  };

  function init(myName, opName) {
    myUsername = myName || 'You';
    opponentUsername = opName || 'Opponent';
    containerEl = document.getElementById('kill-feed');
    if (containerEl) containerEl.innerHTML = '';
  }

  function addEntry(text, type) {
    if (!containerEl) return;

    const entry = document.createElement('div');
    entry.className = 'kf-entry kf-' + (type || 'info');
    entry.innerHTML = text;
    containerEl.appendChild(entry);

    while (containerEl.children.length > MAX_ENTRIES) {
      containerEl.removeChild(containerEl.firstChild);
    }

    setTimeout(() => {
      entry.style.opacity = '0';
      setTimeout(() => entry.remove(), 500);
    }, 4000);
  }

  function hit(shooterIsMe, damage, headshot, weaponType) {
    const shooter = shooterIsMe ? myUsername : opponentUsername;
    const target = shooterIsMe ? opponentUsername : myUsername;
    const weapon = WEAPON_NAMES[weaponType] || weaponType;
    const hs = headshot ? ' <span class="kf-headshot">HEADSHOT</span>' : '';
    addEntry(
      `<span class="kf-name">${shooter}</span> hit <span class="kf-name">${target}</span> for <span class="kf-damage">${damage}</span>${hs}`,
      shooterIsMe ? 'my-hit' : 'enemy-hit'
    );
  }

  function kill(killerIsMe, piece) {
    const killer = killerIsMe ? myUsername : opponentUsername;
    const victim = killerIsMe ? opponentUsername : myUsername;
    const pieceName = PIECE_NAMES[piece] || 'piece';
    addEntry(
      `<span class="kf-name">${killer}</span> eliminated <span class="kf-name">${victim}</span>'s <span class="kf-piece">${pieceName}</span>`,
      killerIsMe ? 'my-kill' : 'enemy-kill'
    );
  }

  function ability(userIsMe, abilityName) {
    const user = userIsMe ? myUsername : opponentUsername;
    addEntry(
      `<span class="kf-name">${user}</span> used <span class="kf-ability">${abilityName}</span>`,
      'ability'
    );
  }

  function clear() {
    if (containerEl) containerEl.innerHTML = '';
  }

  return { init, hit, kill, ability, clear };
})();
