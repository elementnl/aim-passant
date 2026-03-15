const FPSHUD = (() => {
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
    document.getElementById('ammo-text').textContent = `${current} / ${max}`;
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

  function setWeaponInfo(stats) {
    document.getElementById('weapon-info').textContent =
      `${stats.name} | DMG: ${stats.damage} | RPM: ${Math.round(60000 / stats.fireRate)}`;
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

  return { updateHealth, updateAmmo, showReloading, setWeaponInfo, flashDamage, showCountdown };
})();
