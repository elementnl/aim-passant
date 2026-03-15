const FPS = (() => {
  let active = false;
  let duelReady = false;
  let myStats = null;
  let myHP = 0;
  let myRole = null;
  let syncInterval = null;
  let lastTime = 0;
  let dying = false;

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
    dying = false;
    const isAttacker = duelInfo.myRole === 'attacker';
    myRole = duelInfo.myRole;
    myStats = isAttacker ? duelInfo.attacker.stats : duelInfo.defender.stats;
    myHP = myStats.hp;

    const opponentPiece = isAttacker ? duelInfo.defender.piece : duelInfo.attacker.piece;
    const mySpawn = isAttacker ? duelInfo.spawns.attacker : duelInfo.spawns.defender;
    FPSPlayer.spawn(mySpawn);
    FPSOpponent.create(FPSRenderer.getScene(), isAttacker, opponentPiece);
    FPSShooting.reset();
    FPSEffects.clear(FPSRenderer.getScene());
    FPSGun.destroy();
    FPSGun.create(FPSRenderer.getCamera());

    FPSHUD.updateHealth(myHP, myStats.hp);
    FPSHUD.updateAmmo(FPSShooting.getMaxAmmo(), FPSShooting.getMaxAmmo());
    FPSHUD.showReloading(false);
    FPSHUD.setWeaponInfo(myStats);

    const canvas = document.getElementById('duel-canvas');
    const onCanvasClick = () => {
      if (dying) return;
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
        if (active && !dying) Network.sendDuelState(FPSPlayer.getState());
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

    if (duelReady && !dying) {
      FPSPlayer.update(dt, myStats.speed);
      if (FPSInput.isDown('r')) FPSShooting.tryReload();
    }

    FPSPlayer.applyToCamera(FPSRenderer.getCamera());
    FPSOpponent.interpolate();
    FPSShooting.updateBullets(dt);
    FPSEffects.update(dt);
    FPSHUD.updateHealth(myHP, myStats.hp);
    FPSRenderer.render();

    requestAnimationFrame(gameLoop);
  }

  function onTakeDamage({ damage }) {
    myHP -= damage;
    FPSHUD.flashDamage();
    Audio.play('damage');

    if (myHP <= 0) {
      myHP = 0;
      dying = true;
      const winner = myRole === 'attacker' ? 'defender' : 'attacker';
      Network.sendDuelResult(winner);
    }
  }

  function showDeathExplosion(loserIsMe) {
    const scene = FPSRenderer.getScene();
    if (loserIsMe) {
      FPSEffects.explode(scene, FPSPlayer.position.clone(), 0xff4444);
    } else {
      const opMesh = FPSOpponent.getMesh();
      if (opMesh) {
        FPSEffects.explode(scene, opMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xff4444);
        FPSOpponent.destroy(scene);
      }
    }
  }

  function endDuel(duelWinner) {
    if (duelWinner) {
      const iWon = (myRole === 'attacker' && duelWinner === 'attacker') ||
                   (myRole === 'defender' && duelWinner === 'defender');
      showDeathExplosion(!iWon);
    }

    clearInterval(syncInterval);
    syncInterval = null;
    duelReady = false;
    dying = false;

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

    setTimeout(() => {
      active = false;
      FPSEffects.clear(FPSRenderer.getScene());
    }, 2000);
  }

  function isActive() { return active; }

  return { init, startDuel, endDuel, isActive };
})();
