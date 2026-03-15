const FPS = (() => {
  let active = false;
  let duelReady = false;
  let myStats = null;
  let myHP = 0;
  let myRole = null;
  let syncInterval = null;
  let lastTime = 0;
  let dying = false;
  let mouseDown = false;

  let coverMeshes = [];

  function init() {
    const canvas = document.getElementById('duel-canvas');
    FPSRenderer.init(canvas);
    FPSInput.bind(canvas);
  }

  function rebuildArena(arenaIndex) {
    const scene = FPSRenderer.getScene();
    const toRemove = [];
    scene.traverse(child => {
      if (child.isMesh && !child.parent?.isCamera && child.parent === scene) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(m => scene.remove(m));
    coverMeshes = FPSArena.build(scene, arenaIndex);
  }

  function startDuel(duelInfo) {
    active = true;
    duelReady = false;
    dying = false;
    mouseDown = false;
    const isAttacker = duelInfo.myRole === 'attacker';
    myRole = duelInfo.myRole;
    myStats = isAttacker ? duelInfo.attacker.stats : duelInfo.defender.stats;
    const myCurrentHP = isAttacker ? duelInfo.attacker.currentHP : duelInfo.defender.currentHP;
    myHP = myCurrentHP !== undefined ? myCurrentHP : myStats.hp;

    rebuildArena(duelInfo.arenaIndex);

    const opponentPiece = isAttacker ? duelInfo.defender.piece : duelInfo.attacker.piece;
    const mySpawn = isAttacker ? duelInfo.spawns.attacker : duelInfo.spawns.defender;
    FPSPlayer.spawn(mySpawn);
    FPSPlayer.setJumpSpeed(myStats.jumpSpeed);
    const opponentInfo = isAttacker ? duelInfo.defender : duelInfo.attacker;
    FPSOpponent.create(FPSRenderer.getScene(), isAttacker, opponentPiece);
    FPSOpponent.setHP(
      opponentInfo.currentHP !== undefined ? opponentInfo.currentHP : opponentInfo.stats.hp,
      opponentInfo.stats.hp
    );
    FPSShooting.init(myStats);
    FPSShooting.reset();
    FPSEffects.clear(FPSRenderer.getScene());
    FPSGun.destroy();
    FPSGun.create(FPSRenderer.getCamera(), myStats.weapon.type);

    FPSHUD.updateHealth(myHP, myStats.hp);
    FPSHUD.updateAmmo(FPSShooting.getAmmo(), FPSShooting.getMaxAmmo());
    FPSHUD.showReloading(false);
    FPSHUD.showChargeBar(false);
    FPSHUD.showScope(false);
    FPSHUD.setWeaponInfo(myStats);

    const canvas = document.getElementById('duel-canvas');

    const onMouseDown = (e) => {
      if (dying || !duelReady) return;
      if (!FPSInput.isPointerLocked()) {
        FPSInput.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        mouseDown = true;
        FPSShooting.onMouseDown(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      } else if (e.button === 2) {
        handleADSStart();
      }
    };

    const onMouseUp = (e) => {
      if (e.button === 0) {
        mouseDown = false;
        FPSShooting.onMouseUp(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      } else if (e.button === 2) {
        handleADSEnd();
      }
    };

    const onContextMenu = (e) => e.preventDefault();

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas._duelHandlers = { onMouseDown, onMouseUp, onContextMenu };

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);

    FPSHUD.showIntro(duelInfo.attacker, duelInfo.defender, duelInfo.arenaIndex, () => {
      FPSInput.requestPointerLock();
      FPSHUD.showCountdown(() => {
        duelReady = true;
        syncInterval = setInterval(() => {
          if (active && !dying) Network.sendDuelState(FPSPlayer.getState());
        }, FPSConfig.SYNC_RATE);
      });
    });

    Network.on('duel-opponent-state', (data) => FPSOpponent.updateFromNetwork(data));
    Network.on('duel-opponent-shoot', (data) => {
      FPSShooting.showOpponentTracer(FPSRenderer.getScene(), data);
    });
    Network.on('duel-take-damage', onTakeDamage);
  }

  function handleADSStart() {
    if (FPSGun.isReloading()) return;
    const wType = myStats.weapon.type;
    if (wType === 'sniper') {
      FPSGun.setADS(true);
      FPSHUD.showScope(true, 'sniper');
      Audio.play('sniperScope');
      FPSRenderer.setFOV(30);
    } else if (wType === 'ar') {
      FPSGun.setADS(true);
      FPSHUD.showScope(true, 'reddot');
      FPSRenderer.setFOV(60);
    } else if (wType === 'deagle') {
      FPSGun.setADS(true);
      FPSRenderer.setFOV(70);
    }
  }

  function handleADSEnd() {
    const wType = myStats.weapon.type;
    if (wType === 'sniper' || wType === 'ar' || wType === 'deagle') {
      FPSGun.setADS(false);
      FPSHUD.showScope(false);
      FPSRenderer.setFOV(90);
      if (wType === 'sniper') Audio.play('sniperScope');
    }
  }

  function gameLoop(now) {
    if (!active) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (duelReady && !dying) {
      FPSPlayer.update(dt, myStats.speed);
      if (FPSInput.isDown('r')) FPSShooting.tryReload();
      if (mouseDown) {
        FPSShooting.onMouseHeld(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      }
    }

    FPSPlayer.applyToCamera(FPSRenderer.getCamera());
    FPSGun.updateADS();
    FPSOpponent.interpolate();
    FPSShooting.updateBullets(dt);
    FPSShooting.updateBloom(dt);
    FPSShooting.updateChargeBar();
    FPSEffects.update(dt);
    FPSHUD.updateHealth(myHP, myStats.hp);
    FPSRenderer.render();

    requestAnimationFrame(gameLoop);
  }

  function onTakeDamage({ damage, headshot }) {
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
    mouseDown = false;

    FPSHUD.showScope(false);
    FPSHUD.showChargeBar(false);
    FPSRenderer.setFOV(90);

    const canvas = document.getElementById('duel-canvas');
    if (canvas._duelHandlers) {
      canvas.removeEventListener('mousedown', canvas._duelHandlers.onMouseDown);
      canvas.removeEventListener('mouseup', canvas._duelHandlers.onMouseUp);
      canvas.removeEventListener('contextmenu', canvas._duelHandlers.onContextMenu);
      delete canvas._duelHandlers;
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
  function getMyHP() { return myHP; }

  return { init, startDuel, endDuel, isActive, getMyHP };
})();
