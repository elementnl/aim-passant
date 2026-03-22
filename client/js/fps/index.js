const FPS = (() => {
  let active = false;
  let duelReady = false;
  let myStats = null;
  let myHP = 0;
  let myMaxHP = 0;
  let myRole = null;
  let myPiece = null;
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
    FPSArena.resetDestroyed();
    const canvas = document.getElementById('duel-canvas');
    FPSRenderer.init(canvas);

    const scene = FPSRenderer.getScene();
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
    myPiece = isAttacker ? duelInfo.attacker.piece : duelInfo.defender.piece;
    const myCurrentHP = isAttacker ? duelInfo.attacker.currentHP : duelInfo.defender.currentHP;
    myHP = myCurrentHP !== undefined ? myCurrentHP : myStats.hp;
    myMaxHP = myStats.hp;

    rebuildArena(duelInfo.arenaIndex);
    FPSInput.bind(document.getElementById('duel-canvas'));

    const opponentPiece = isAttacker ? duelInfo.defender.piece : duelInfo.attacker.piece;
    const mySpawn = isAttacker ? duelInfo.spawns.attacker : duelInfo.spawns.defender;
    FPSPlayer.spawn(mySpawn);
    FPSPlayer.setJumpSpeed(myStats.jumpSpeed);
    FPSPlayer.setDoubleJump(myPiece === 'n');
    const opponentInfo = isAttacker ? duelInfo.defender : duelInfo.attacker;
    _opponentPiece = opponentPiece;
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

    FPSHUD.updateHealth(myHP, myMaxHP);
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
      if (FPSAbilities.isDisarmed()) return;
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

    const onPointerLockChange = () => {
      if (!active || !duelReady) return;
      if (!FPSInput.isPointerLocked()) {
        document.getElementById('duel-pause').classList.remove('hidden');
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas._duelHandlers = { onMouseDown, onMouseUp, onContextMenu, onPointerLockChange };

    document.getElementById('btn-duel-resume').onclick = () => {
      document.getElementById('duel-pause').classList.add('hidden');
      try {
        canvas.requestPointerLock({ unadjustedMovement: true });
      } catch {
        canvas.requestPointerLock();
      }
    };
    document.getElementById('btn-duel-settings').onclick = () => {
      document.getElementById('settings-modal').classList.remove('hidden');
    };
    document.getElementById('btn-duel-leave').onclick = () => {
      window.location.reload();
    };

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);

    FPSHUD.showIntro(duelInfo.attacker, duelInfo.defender, duelInfo.arenaIndex, () => {
      FPSInput.requestPointerLock();
      FPSHUD.showCountdown(() => {
        duelReady = true;
        Audio.playMusic();
        FPSAbilities.init(myPiece, performance.now());
        syncInterval = setInterval(() => {
          if (active && !dying) {
            const state = FPSPlayer.getState();
            state.hp = myHP;
            state.maxHP = myMaxHP;
            Network.sendDuelState(state);
          }
        }, FPSConfig.SYNC_RATE);
      });
    });

    Network.on('duel-opponent-state', (data) => {
      FPSOpponent.updateFromNetwork(data);
      if (data.hp !== undefined && data.maxHP !== undefined) {
        FPSOpponent.setHP(data.hp, data.maxHP);
      }
    });
    Network.on('duel-opponent-shoot', (data) => {
      FPSShooting.showOpponentTracer(FPSRenderer.getScene(), data);
    });
    Network.on('duel-take-damage', onTakeDamage);
    Network.on('duel-opponent-ability', (data) => FPSAbilities.onOpponentAbility(data));
    Network.on('duel-opponent-effect', (data) => {
      FPSAbilities.onOpponentEffect(data);
    });
    Network.on('duel-crate-destroy', (data) => {
      FPSArena.destroyCrate(data.coverIndex);
    });

    FPSAbilities.setSelfDamageCallback((damage) => {
      applyDamage(damage);
    });
  }

  function handleADSStart() {
    if (FPSGun.isReloading()) return;
    if (FPSAbilities.isDisarmed()) return;
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
      const isFrozen = FPSAbilities.isFrozen();
      const isPulled = FPSAbilities.isPulled();
      if (isFrozen) {
        FPSInput.consumeMouse();
      } else if (isPulled) {
        FPSPlayer.update(dt, 0);
      } else {
        FPSPlayer.update(dt, myStats.speed);
      }
      if (FPSInput.isDown('r')) FPSShooting.tryReload();
      if (FPSInput.isDown('q') && !isFrozen) FPSAbilities.tryUlt();
      if (mouseDown && !FPSAbilities.isDisarmed()) {
        FPSShooting.onMouseHeld(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      }

      FPSAbilities.update(dt);

      if (FPSAbilities.getPieceType() === 'p') {
        const regenResult = FPSAbilities.update.__regenCheck;
        if (myHP < myMaxHP) {
          myHP = Math.min(myHP + 1.5 * dt, myMaxHP);
        }
      }
    }

    FPSPlayer.applyToCamera(FPSRenderer.getCamera());
    FPSGun.updateADS();
    FPSOpponent.interpolate();
    FPSShooting.updateBullets(dt);
    FPSShooting.updateBloom(dt);
    FPSShooting.updateChargeBar();
    FPSEffects.update(dt);
    FPSHUD.updateHealth(myHP, myMaxHP);
    FPSRenderer.render();

    requestAnimationFrame(gameLoop);
  }

  function applyDamage(damage) {
    const processed = FPSAbilities.processDamage(damage, false);
    if (processed <= 0) return;
    myHP -= processed;
    FPSHUD.flashDamage();
    Audio.play('damage');

    if (myHP <= 0) {
      if (FPSAbilities.canBishopResurrect() && !dying) {
        handleBishopResurrect();
        return;
      }
      myHP = 0;
      dying = true;
      const winner = myRole === 'attacker' ? 'defender' : 'attacker';
      Network.sendDuelResult(winner);
    }
  }

  function onTakeDamage({ damage, headshot }) {
    const processed = FPSAbilities.processDamage(damage, headshot);
    if (processed <= 0) return;

    myHP -= processed;
    FPSHUD.flashDamage();
    Audio.play('damage');

    if (myHP <= 0) {
      if (FPSAbilities.canBishopResurrect() && !dying) {
        handleBishopResurrect();
        return;
      }
      myHP = 0;
      dying = true;
      const winner = myRole === 'attacker' ? 'defender' : 'attacker';
      Network.sendDuelResult(winner);
    }
  }

  function handleBishopResurrect() {
    FPSAbilities.useBishopResurrect();
    myHP = 40;
    Audio.play('bishopResurrect');
    Network.emit('duel-ability-effect', { effect: 'bishopResurrect' });

    const half = FPSConfig.ARENA_SIZE / 2 - 2;
    const x = (Math.random() - 0.5) * 2 * half;
    const z = (Math.random() - 0.5) * 2 * half;

    FPSPlayer.spawn({ x, z, yaw: Math.random() * Math.PI * 2 });
    FPSHUD.updateHealth(myHP, myMaxHP);
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

    Audio.stopMusic();
    Audio.stop('minigunFire');
    Audio.stop('minigunSpinup');
    FPSShooting.reset();
    FPSAbilities.cleanup();
    FPSHUD.showScope(false);
    FPSHUD.showChargeBar(false);
    FPSRenderer.setFOV(90);

    document.getElementById('duel-pause').classList.add('hidden');

    const canvas = document.getElementById('duel-canvas');
    if (canvas._duelHandlers) {
      canvas.removeEventListener('mousedown', canvas._duelHandlers.onMouseDown);
      canvas.removeEventListener('mouseup', canvas._duelHandlers.onMouseUp);
      canvas.removeEventListener('contextmenu', canvas._duelHandlers.onContextMenu);
      if (canvas._duelHandlers.onPointerLockChange) {
        document.removeEventListener('pointerlockchange', canvas._duelHandlers.onPointerLockChange);
      }
      delete canvas._duelHandlers;
    }

    FPSGun.destroy();
    FPSInput.releasePointerLock();
    FPSInput.clearAll();

    Network.off('duel-opponent-state');
    Network.off('duel-opponent-shoot');
    Network.off('duel-take-damage');
    Network.off('duel-opponent-ability');
    Network.off('duel-opponent-effect');
    Network.off('duel-crate-destroy');

    setTimeout(() => {
      active = false;
      FPSEffects.clear(FPSRenderer.getScene());
    }, 2000);
  }

  function toggleDuelPause() {
    const el = document.getElementById('duel-pause');
    const showing = el.classList.contains('hidden');
    el.classList.toggle('hidden', !showing);
  }

  function isActive() { return active; }
  function getMyHP() { return myHP; }
  function getWeaponType() { return myStats ? myStats.weapon.type : 'pistol'; }
  function getOpponentPiece() { return myRole === 'attacker' ? _opponentPiece : _opponentPiece; }
  function getMyRole() { return myRole; }

  let _opponentPiece = 'p';

  return { init, startDuel, endDuel, isActive, getMyHP, getWeaponType, getOpponentPiece, getMyRole };
})();
