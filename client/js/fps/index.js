const FPS = (() => {
  let active = false;
  let duelReady = false;
  let myStats = null;
  let myHP = 0;
  let myRole = null;
  let syncInterval = null;
  let lastTime = 0;

  let coverMeshes = [];

  function init() {
    const canvas = document.getElementById('duel-canvas');
    FPSRenderer.init(canvas);
    coverMeshes = FPSArena.build(FPSRenderer.getScene());
    FPSInput.bind(canvas);
  }

  function startDuel(duelInfo) {
    active = true;
    duelReady = false;
    const isAttacker = duelInfo.myRole === 'attacker';
    myRole = duelInfo.myRole;
    myStats = isAttacker ? duelInfo.attacker.stats : duelInfo.defender.stats;
    myHP = myStats.hp;

    FPSPlayer.spawn(isAttacker);
    FPSOpponent.create(FPSRenderer.getScene(), isAttacker);
    FPSShooting.reset();
    FPSGun.destroy();
    FPSGun.create(FPSRenderer.getCamera());

    FPSHUD.updateHealth(myHP, myStats.hp);
    FPSHUD.setWeaponInfo(myStats);

    const canvas = document.getElementById('duel-canvas');
    const onCanvasClick = () => {
      if (FPSInput.isPointerLocked()) {
        FPSShooting.tryShoot(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      } else {
        FPSInput.requestPointerLock();
      }
    };
    canvas.addEventListener('click', onCanvasClick);
    canvas._duelClickHandler = onCanvasClick;

    FPSInput.requestPointerLock();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);

    FPSHUD.showCountdown(() => {
      duelReady = true;
      syncInterval = setInterval(() => {
        if (active) Network.sendDuelState(FPSPlayer.getState());
      }, FPSConfig.SYNC_RATE);
    });

    Network.on('duel-opponent-state', (data) => FPSOpponent.updateFromNetwork(data));
    Network.on('duel-opponent-shoot', (data) => FPSShooting.showOpponentTracer(FPSRenderer.getScene(), data));
    Network.on('duel-take-damage', onTakeDamage);
  }

  function gameLoop(now) {
    if (!active) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (duelReady) {
      FPSPlayer.update(dt, myStats.speed);
    }

    FPSPlayer.applyToCamera(FPSRenderer.getCamera());
    FPSOpponent.interpolate();
    FPSShooting.updateBullets(dt);
    FPSHUD.updateHealth(myHP, myStats.hp);
    FPSRenderer.render();

    requestAnimationFrame(gameLoop);
  }

  function onTakeDamage({ damage }) {
    myHP -= damage;
    FPSHUD.flashDamage();

    if (myHP <= 0) {
      const winner = myRole === 'attacker' ? 'defender' : 'attacker';
      Network.sendDuelResult(winner);
      endDuel();
    }
  }

  function endDuel() {
    active = false;
    duelReady = false;

    clearInterval(syncInterval);
    syncInterval = null;

    const canvas = document.getElementById('duel-canvas');
    if (canvas._duelClickHandler) {
      canvas.removeEventListener('click', canvas._duelClickHandler);
      delete canvas._duelClickHandler;
    }

    FPSGun.destroy();
    FPSInput.releasePointerLock();
    FPSInput.clearAll();

    Network.off('duel-opponent-state');
    Network.off('duel-opponent-shoot');
    Network.off('duel-take-damage');
  }

  function isActive() { return active; }

  return { init, startDuel, endDuel, isActive };
})();
