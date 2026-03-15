const FPSHUD = (() => {
  const PIECE_CHARS = {
    p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B', k: '\u265A',
  };

  const WEAPON_NAMES = {
    pistol: 'Pistol', bow: 'Bow', shotgun: 'Shotgun',
    sniper: 'Sniper Rifle', ar: 'Assault Rifle', deagle: 'Desert Eagle',
  };

  const ARENA_NAMES = ['Warehouse', 'Corridors', 'Towers', 'Sniper Alley'];

  function showIntro(attacker, defender, arenaIndex, callback) {
    const el = document.getElementById('duel-intro');

    document.getElementById('intro-attacker-piece').textContent = PIECE_CHARS[attacker.piece] || '?';
    document.getElementById('intro-attacker-name').textContent = attacker.stats.name;
    document.getElementById('intro-attacker-weapon').textContent = WEAPON_NAMES[attacker.stats.weapon.type] || '';
    document.getElementById('intro-attacker-piece').style.color =
      attacker.color === 'white' ? '#fff' : '#ccc';

    document.getElementById('intro-defender-piece').textContent = PIECE_CHARS[defender.piece] || '?';
    document.getElementById('intro-defender-name').textContent = defender.stats.name;
    document.getElementById('intro-defender-weapon').textContent = WEAPON_NAMES[defender.stats.weapon.type] || '';
    document.getElementById('intro-defender-piece').style.color =
      defender.color === 'white' ? '#fff' : '#ccc';

    document.getElementById('intro-map-name').textContent = ARENA_NAMES[arenaIndex] || 'Arena';

    el.classList.remove('hidden');
    Audio.play('duelStart');

    setTimeout(() => {
      el.classList.add('hidden');
      if (callback) callback();
    }, 2500);
  }

  function updateHealth(current, max) {
    const pct = Math.max(0, current / max * 100);
    document.getElementById('health-fill').style.width = pct + '%';
    document.getElementById('health-text').textContent = Math.max(0, Math.ceil(current));

    const fill = document.getElementById('health-fill');
    if (pct > 60) fill.style.background = '#2ecc71';
    else if (pct > 30) fill.style.background = '#e9a545';
    else fill.style.background = '#e74c3c';
  }

  function updateAmmo(current, max) {
    const el = document.getElementById('ammo-text');
    if (max === Infinity) {
      el.textContent = '\u221E';
    } else {
      el.textContent = `${current} / ${max}`;
    }
  }

  function showReloading(show) {
    const indicator = document.getElementById('reload-indicator');
    const spinner = document.getElementById('reload-spinner');
    if (show) {
      indicator.classList.remove('hidden');
      spinner.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
      spinner.classList.add('hidden');
    }
  }

  function showChargeBar(show) {
    const el = document.getElementById('charge-bar-container');
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }

  function updateChargeBar(pct) {
    document.getElementById('charge-fill').style.width = (pct * 100) + '%';
  }

  function showScope(show, type) {
    const sniper = document.getElementById('scope-overlay');
    const reddot = document.getElementById('reddot-overlay');
    const crosshair = document.getElementById('crosshair');
    sniper.classList.add('hidden');
    reddot.classList.add('hidden');

    if (show && type === 'sniper') {
      sniper.classList.remove('hidden');
      crosshair.classList.add('hidden');
    } else if (show && type === 'reddot') {
      reddot.classList.remove('hidden');
      crosshair.classList.add('hidden');
    } else {
      crosshair.classList.remove('hidden');
    }
  }

  function setWeaponInfo(stats) {
    const w = stats.weapon;
    const wName = WEAPON_NAMES[w.type] || w.type;
    document.getElementById('weapon-info').textContent = wName;
  }

  function flashDamage() {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(231,76,60,0.3);pointer-events:none;z-index:50;';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), FPSConfig.DAMAGE_FLASH_DURATION);
  }

  function showCountdown(callback) {
    const el = document.getElementById('duel-countdown');
    el.classList.remove('hidden');
    let count = 3;
    el.textContent = count;
    Audio.play('countdownTick');

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        el.textContent = count;
        Audio.play('countdownTick');
      } else if (count === 0) {
        el.textContent = 'FIGHT!';
        Audio.play('countdownGo');
      } else {
        el.classList.add('hidden');
        clearInterval(interval);
        callback();
      }
    }, FPSConfig.COUNTDOWN_INTERVAL);
  }

  return {
    showIntro, updateHealth, updateAmmo, showReloading, showChargeBar, updateChargeBar,
    showScope, setWeaponInfo, flashDamage, showCountdown,
  };
})();
