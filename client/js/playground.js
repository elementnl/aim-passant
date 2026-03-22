const Playground = (() => {
  let active = false;
  let coverMeshes = [];

  let myStats = null;
  let myPiece = 'p';
  let myHP = 100;
  let myMaxHP = 100;
  let lastTime = 0;
  let mouseDown = false;
  let paused = false;
  let dummyHP = 0;
  let dummyMaxHP = 0;

  const PIECE_KEYS = { '1': 'p', '2': 'n', '3': 'b', '4': 'r', '5': 'q', '6': 'k' };
  const PIECE_NAMES = { p: 'PAWN', n: 'KNIGHT', b: 'BISHOP', r: 'ROOK', q: 'QUEEN', k: 'KING' };

  function start() {
    active = true;
    paused = false;
    Game.showScreen('playground');

    const canvas = document.getElementById('playground-canvas');
    FPSRenderer.init(canvas);
    coverMeshes = FPSArena.build(FPSRenderer.getScene(), 0);
    FPSInput.bind(canvas);

    spawnDummy();

    FPSShooting.setHitCallback((dmg) => {
      dummyHP -= dmg;
      if (dummyHP <= 0) {
        Audio.play('explosion');
        const opMesh = FPSOpponent.getMesh();
        if (opMesh) {
          FPSEffects.explode(FPSRenderer.getScene(), opMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xcc4444);
          FPSOpponent.destroy(FPSRenderer.getScene());
        }
        setTimeout(spawnDummy, 500);
      }
    });

    FPSAbilities.setSelfDamageCallback((dmg) => {
      dummyHP -= dmg;
      FPSOpponent.setHP(Math.max(0, dummyHP), dummyMaxHP);
      if (dummyHP <= 0) {
        Audio.play('explosion');
        const opMesh = FPSOpponent.getMesh();
        if (opMesh) {
          FPSEffects.explode(FPSRenderer.getScene(), opMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xcc4444);
          FPSOpponent.destroy(FPSRenderer.getScene());
        }
        setTimeout(spawnDummy, 500);
      }
    });

    switchPiece('p');

    const onMouseDown = (e) => {
      if (paused) return;
      if (!FPSInput.isPointerLocked()) {
        FPSInput.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        mouseDown = true;
        FPSShooting.onMouseDown(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      } else if (e.button === 2) {
        handleADS(true);
      }
    };

    const onMouseUp = (e) => {
      if (e.button === 0) {
        mouseDown = false;
        FPSShooting.onMouseUp(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      } else if (e.button === 2) {
        handleADS(false);
      }
    };

    const onContextMenu = (e) => e.preventDefault();

    const onKeyDown = (e) => {
      if (!active || paused) return;
      const piece = PIECE_KEYS[e.key];
      if (piece) switchPiece(piece);
    };

    const onPointerLockChange = () => {
      if (!active) return;
      if (!FPSInput.isPointerLocked() && !paused) {
        togglePause();
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas._pgHandlers = { onMouseDown, onMouseUp, onContextMenu, onKeyDown, onPointerLockChange };

    document.getElementById('btn-pg-resume').addEventListener('click', () => {
      togglePause();
      try {
        canvas.requestPointerLock({ unadjustedMovement: true });
      } catch {
        canvas.requestPointerLock();
      }
    });

    document.getElementById('btn-pg-settings').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('hidden');
    });

    document.getElementById('btn-pg-exit').addEventListener('click', () => {
      stop();
    });

    Audio.stopMusic();
    Audio.playMusic('playground');
    FPSInput.requestPointerLock();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function spawnDummy() {
    const spawn = getRandomSpawn();
    dummyMaxHP = PIECE_STATS['q'].hp;
    dummyHP = dummyMaxHP;

    FPSOpponent.create(FPSRenderer.getScene(), true, 'q');
    FPSOpponent.setHP(dummyHP, dummyMaxHP);
    FPSOpponent.forcePosition(spawn.x, FPSConfig.PLAYER_HEIGHT, spawn.z);
  }

  function getRandomSpawn() {
    const half = FPSArena.getArenaSize() / 2 - 2;
    const colliders = FPSArena.getColliders();
    const RADIUS = 0.8;

    for (let attempt = 0; attempt < 200; attempt++) {
      const x = (Math.random() - 0.5) * 2 * half;
      const z = (Math.random() - 0.5) * 2 * half;
      let blocked = false;
      for (const c of colliders) {
        if (x + RADIUS > c.minX && x - RADIUS < c.maxX &&
            z + RADIUS > c.minZ && z - RADIUS < c.maxZ && c.maxY > 0.2) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return { x, z };
    }
    return { x: 8, z: 8 };
  }

  function switchPiece(piece) {
    myPiece = piece;
    myStats = { ...PIECE_STATS[piece] };
    if (myStats.weapon.magSize === null) myStats.weapon.magSize = Infinity;
    myHP = myStats.hp;
    myMaxHP = myStats.hp;

    FPSPlayer.spawn({ x: -10, z: 0, yaw: Math.PI / 2 });
    FPSPlayer.setJumpSpeed(myStats.jumpSpeed);
    FPSPlayer.setDoubleJump(piece === 'n');

    FPSShooting.init(myStats);
    FPSShooting.reset();
    FPSGun.destroy();
    FPSGun.create(FPSRenderer.getCamera(), myStats.weapon.type);

    FPSAbilities.init(piece, performance.now());

    document.getElementById('pg-piece-name').textContent = PIECE_NAMES[piece];
    updateHUD();
  }

  function handleADS(start) {
    if (start) {
      if (FPSGun.isReloading()) return;
      const wt = myStats.weapon.type;
      if (wt === 'sniper') {
        FPSGun.setADS(true);
        FPSHUD.showScope(true, 'sniper');
        FPSRenderer.setFOV(30);
      } else if (wt === 'ar') {
        FPSGun.setADS(true);
        FPSHUD.showScope(true, 'reddot');
        FPSRenderer.setFOV(60);
      } else if (wt === 'deagle') {
        FPSGun.setADS(true);
        FPSRenderer.setFOV(70);
      }
    } else {
      FPSGun.setADS(false);
      FPSHUD.showScope(false);
      FPSRenderer.setFOV(90);
    }
  }

  function togglePause() {
    paused = !paused;
    document.getElementById('pg-pause').classList.toggle('hidden', !paused);
    if (paused) {
      FPSInput.releasePointerLock();
    }
  }

  function gameLoop(now) {
    if (!active) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!paused) {
      FPSPlayer.update(dt, myStats.speed);

      if (FPSInput.isDown('r')) FPSShooting.tryReload();
      if (FPSInput.isDown('q')) FPSAbilities.tryUlt();
      if (mouseDown && !FPSAbilities.isDisarmed()) {
        FPSShooting.onMouseHeld(FPSRenderer.getCamera(), FPSOpponent.getMesh(), myStats, coverMeshes);
      }

      FPSAbilities.update(dt);

      if (myPiece === 'p' && myHP < myMaxHP) {
        myHP = Math.min(myHP + 1.5 * dt, myMaxHP);
      }
    }

    FPSPlayer.applyToCamera(FPSRenderer.getCamera());
    FPSGun.updateADS();
    FPSOpponent.interpolate();
    FPSShooting.updateBullets(dt);
    FPSShooting.updateBloom(dt);
    FPSShooting.updateChargeBar();
    FPSEffects.update(dt);

    updateHUD();
    FPSRenderer.render();

    requestAnimationFrame(gameLoop);
  }

  function updateHUD() {
    const healthPct = Math.max(0, myHP / myMaxHP * 100);
    const fill = document.getElementById('pg-health-fill');
    if (fill) {
      fill.style.width = healthPct + '%';
      if (healthPct > 60) fill.style.background = '#2ecc71';
      else if (healthPct > 30) fill.style.background = '#e9a545';
      else fill.style.background = '#e74c3c';
    }
    const txt = document.getElementById('pg-health-text');
    if (txt) txt.textContent = Math.ceil(myHP);

    const ammo = FPSShooting.getAmmo();
    const max = FPSShooting.getMaxAmmo();
    const ammoEl = document.getElementById('pg-ammo');
    if (ammoEl) ammoEl.textContent = (!isFinite(max) || max === null) ? '\u221E' : `${ammo} / ${max}`;
  }

  function stop() {
    active = false;
    paused = false;
    mouseDown = false;

    const canvas = document.getElementById('playground-canvas');
    if (canvas && canvas._pgHandlers) {
      canvas.removeEventListener('mousedown', canvas._pgHandlers.onMouseDown);
      canvas.removeEventListener('mouseup', canvas._pgHandlers.onMouseUp);
      canvas.removeEventListener('contextmenu', canvas._pgHandlers.onContextMenu);
      document.removeEventListener('keydown', canvas._pgHandlers.onKeyDown);
      if (canvas._pgHandlers.onPointerLockChange) {
        document.removeEventListener('pointerlockchange', canvas._pgHandlers.onPointerLockChange);
      }
      delete canvas._pgHandlers;
    }

    FPSGun.destroy();
    FPSInput.releasePointerLock();
    FPSInput.clearAll();
    FPSShooting.setHitCallback(null);
    FPSShooting.reset();
    FPSAbilities.cleanup();

    document.getElementById('pg-pause').classList.add('hidden');
    FPSHUD.showScope(false);

    FPSOpponent.destroy(FPSRenderer.getScene());

    Audio.stopMusic();
    Audio.playMusic('lobby');
    LobbyBG.init();
    Game.showScreen('lobby');
  }

  function respawnDummy() { spawnDummy(); }
  function getWeaponType() { return myStats ? myStats.weapon.type : 'pistol'; }
  function isKnightUltActive() { return FPSAbilities.isKnightUltActive(); }
  function consumeKnightUlt() { FPSAbilities.consumeKnightUlt(); }

  return { start, stop, respawnDummy, getWeaponType, isKnightUltActive, consumeKnightUlt };
})();
