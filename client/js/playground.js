const Playground = (() => {
  let active = false;
  let coverMeshes = [];
  let dummyMesh = null;
  let dummyHealthBar = null;
  let dummyFillMesh = null;
  let dummyHP = 0;
  let dummyMaxHP = 0;
  const BAR_WIDTH = 1.2;

  let myStats = null;
  let myPiece = 'p';
  let myHP = 100;
  let myMaxHP = 100;
  let lastTime = 0;
  let mouseDown = false;
  let paused = false;

  let ultReady = false;
  let ultCooldownEnd = 0;
  let knightUltArrow = false;
  const ULT_COOLDOWN = 5000;

  const PIECE_KEYS = { '1': 'p', '2': 'n', '3': 'b', '4': 'r', '5': 'q', '6': 'k' };
  const PIECE_NAMES = { p: 'PAWN', n: 'KNIGHT', b: 'BISHOP', r: 'ROOK', q: 'QUEEN', k: 'KING' };

  const VOICE_LINES = {
    p: ['voicePawnUlt'],
    n: ['voiceKnightHorse', 'voiceKnightUlt'],
    b: ['voiceBishopUlt'],
    r: ['voiceRookUlt'],
    q: ['voiceQueenUlt'],
    k: ['voiceKingUlt'],
  };

  function start() {
    active = true;
    paused = false;
    Game.showScreen('playground');

    const canvas = document.getElementById('playground-canvas');
    FPSRenderer.init(canvas);
    coverMeshes = FPSArena.build(FPSRenderer.getScene(), 0);
    FPSInput.bind(canvas);

    createDummy();
    FPSShooting.setHitCallback((dmg) => dummyTakeDamage(dmg));
    switchPiece('p');

    const onMouseDown = (e) => {
      if (paused) return;
      if (!FPSInput.isPointerLocked()) {
        FPSInput.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        mouseDown = true;
        FPSShooting.onMouseDown(FPSRenderer.getCamera(), dummyMesh, myStats, coverMeshes);
      } else if (e.button === 2) {
        handleADS(true);
      }
    };

    const onMouseUp = (e) => {
      if (e.button === 0) {
        mouseDown = false;
        FPSShooting.onMouseUp(FPSRenderer.getCamera(), dummyMesh, myStats, coverMeshes);
      } else if (e.button === 2) {
        handleADS(false);
      }
    };

    const onContextMenu = (e) => e.preventDefault();

    const onKeyDown = (e) => {
      if (!active) return;
      if (e.key === 'Escape') {
        togglePause();
        return;
      }
      if (paused) return;
      const piece = PIECE_KEYS[e.key];
      if (piece) switchPiece(piece);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    canvas._pgHandlers = { onMouseDown, onMouseUp, onContextMenu, onKeyDown };

    document.getElementById('btn-pg-resume').addEventListener('click', () => {
      togglePause();
      FPSInput.requestPointerLock();
    });

    document.getElementById('btn-pg-exit').addEventListener('click', () => {
      stop();
    });

    FPSInput.requestPointerLock();
    ultCooldownEnd = performance.now() + ULT_COOLDOWN;
    ultReady = false;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function createDummy() {
    const scene = FPSRenderer.getScene();

    if (dummyMesh) scene.remove(dummyMesh);
    if (dummyHealthBar) scene.remove(dummyHealthBar);

    dummyMesh = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc4444 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 8), bodyMat);
    dummyMesh.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), bodyMat);
    head.position.y = 1.1;
    dummyMesh.add(head);

    const baseMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8), baseMat);
    base.position.y = -0.8;
    dummyMesh.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), baseMat);
    pole.position.y = -0.55;
    dummyMesh.add(pole);

    const spawn = getRandomSpawn();
    dummyMesh.position.set(spawn.x, 0.8, spawn.z);
    scene.add(dummyMesh);

    dummyMaxHP = PIECE_STATS['q'].hp;
    dummyHP = dummyMaxHP;

    dummyHealthBar = new THREE.Group();
    const bgGeo = new THREE.PlaneGeometry(BAR_WIDTH, 0.1);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    dummyHealthBar.add(new THREE.Mesh(bgGeo, bgMat));

    const fillGeo = new THREE.PlaneGeometry(BAR_WIDTH, 0.1);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    dummyFillMesh = new THREE.Mesh(fillGeo, fillMat);
    dummyHealthBar.add(dummyFillMesh);

    dummyHealthBar.position.set(spawn.x, 2.5, spawn.z);
    scene.add(dummyHealthBar);
  }

  function getRandomSpawn() {
    const half = FPSConfig.ARENA_SIZE / 2 - 2;
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

  function dummyTakeDamage(dmg) {
    dummyHP -= dmg;
    updateDummyHealthBar();
    if (dummyHP <= 0) {
      const scene = FPSRenderer.getScene();
      Audio.play('explosion');
      FPSEffects.explode(scene, dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xcc4444);
      createDummy();
    }
  }

  function updateDummyHealthBar() {
    if (!dummyFillMesh) return;
    const pct = Math.max(0, dummyHP / dummyMaxHP);
    dummyFillMesh.scale.x = pct;
    dummyFillMesh.position.x = -(BAR_WIDTH * (1 - pct)) / 2;

    const mat = dummyFillMesh.material;
    if (pct > 0.6) mat.color.setHex(0x2ecc71);
    else if (pct > 0.3) mat.color.setHex(0xe9a545);
    else mat.color.setHex(0xe74c3c);
  }

  function switchPiece(piece) {
    myPiece = piece;
    myStats = { ...PIECE_STATS[piece] };
    if (myStats.weapon.magSize === null) myStats.weapon.magSize = Infinity;
    myHP = myStats.hp;
    myMaxHP = myStats.hp;
    knightUltArrow = false;

    FPSPlayer.spawn({ x: -10, z: 0, yaw: Math.PI / 2 });
    FPSPlayer.setJumpSpeed(myStats.jumpSpeed);
    FPSPlayer.setDoubleJump(piece === 'n');

    FPSShooting.init(myStats);
    FPSShooting.reset();
    FPSGun.destroy();
    FPSGun.create(FPSRenderer.getCamera(), myStats.weapon.type);

    ultReady = false;
    ultCooldownEnd = performance.now() + ULT_COOLDOWN;

    document.getElementById('pg-piece-name').textContent = PIECE_NAMES[piece];
    updateHUD();
  }

  function handleADS(start) {
    if (start) {
      if (FPSGun.isReloading()) return;
      const wt = myStats.weapon.type;
      if (wt === 'sniper') {
        FPSGun.setADS(true);
        showScope('sniper');
        FPSRenderer.setFOV(30);
      } else if (wt === 'ar') {
        FPSGun.setADS(true);
        showScope('reddot');
        FPSRenderer.setFOV(60);
      } else if (wt === 'deagle') {
        FPSGun.setADS(true);
        FPSRenderer.setFOV(70);
      }
    } else {
      FPSGun.setADS(false);
      showScope(null);
      FPSRenderer.setFOV(90);
    }
  }

  function showScope(type) {
    document.getElementById('pg-scope').classList.add('hidden');
    document.getElementById('pg-reddot').classList.add('hidden');
    const ch = document.getElementById('crosshair-pg');
    if (ch) ch.classList.remove('hidden');
    if (type === 'sniper') {
      document.getElementById('pg-scope').classList.remove('hidden');
      if (ch) ch.classList.add('hidden');
    } else if (type === 'reddot') {
      document.getElementById('pg-reddot').classList.remove('hidden');
      if (ch) ch.classList.add('hidden');
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
      if (FPSInput.isDown('q')) tryUlt();
      if (mouseDown) {
        FPSShooting.onMouseHeld(FPSRenderer.getCamera(), dummyMesh, myStats, coverMeshes);
      }

      if (!ultReady && now >= ultCooldownEnd) {
        ultReady = true;
        Audio.play('ultReady');
      }

      if (myPiece === 'p' && myHP < myMaxHP) {
        myHP = Math.min(myHP + 1.5 * dt, myMaxHP);
      }
    }

    FPSPlayer.applyToCamera(FPSRenderer.getCamera());
    FPSGun.updateADS();
    FPSShooting.updateBullets(dt);
    FPSShooting.updateBloom(dt);
    FPSShooting.updateChargeBar();
    FPSEffects.update(dt);

    if (dummyHealthBar) {
      dummyHealthBar.lookAt(FPSRenderer.getCamera().position);
    }

    updateHUD();
    updateUltHUD(now);
    FPSRenderer.render();

    requestAnimationFrame(gameLoop);
  }

  function tryUlt() {
    if (!ultReady) return;
    ultReady = false;
    ultCooldownEnd = performance.now() + ULT_COOLDOWN;

    VOICE_LINES[myPiece]?.forEach(v => Audio.play(v));

    const scene = FPSRenderer.getScene();

    if (myPiece === 'p') {
      Audio.play('pawnFlashbang');
    }

    if (myPiece === 'n') {
      knightUltArrow = true;
    }

    if (myPiece === 'b') {
      Audio.play('bishopSpell');
      spawnBeamToDummy();
    }

    if (myPiece === 'r') {
      Audio.play('rookCloak');
      showCloakEffect(true);
      setTimeout(() => {
        Audio.play('whoosh');
        showCloakEffect(false);
      }, 3000);
    }

    if (myPiece === 'q') {
      Audio.play('fireballLaunch');
      launchFireball();
    }

    if (myPiece === 'k') {
      Audio.play('airstrikeCall');
      launchAirstrike();
    }
  }

  function spawnBeamToDummy() {
    const scene = FPSRenderer.getScene();
    const camera = FPSRenderer.getCamera();
    const start = camera.position.clone();
    const end = dummyMesh.position.clone();
    end.y += 0.8;

    const mid = start.clone().lerp(end, 0.5);
    const length = start.distanceTo(end);

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xbb88ff, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, length, 6), beamMat);
    beam.position.copy(mid);
    beam.lookAt(end);
    beam.rotateX(Math.PI / 2);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0x9944ff, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, length, 6), glowMat);
    glow.position.copy(mid);
    glow.lookAt(end);
    glow.rotateX(Math.PI / 2);

    const light = new THREE.PointLight(0x9944ff, 2, 10);
    light.position.copy(end);

    scene.add(beam);
    scene.add(glow);
    scene.add(light);

    let life = 0.6;
    const fade = () => {
      life -= 0.016;
      const o = Math.max(0, life / 0.6);
      beamMat.opacity = 0.8 * o;
      glowMat.opacity = 0.3 * o;
      light.intensity = 2 * o;
      if (life > 0) requestAnimationFrame(fade);
      else { scene.remove(beam); scene.remove(glow); scene.remove(light); }
    };
    setTimeout(fade, 200);
  }

  function showCloakEffect(show) {
    let el = document.getElementById('pg-cloak');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'pg-cloak';
        el.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;' +
          'border:2px solid rgba(100,200,255,0.3);pointer-events:none;z-index:11;' +
          'box-shadow:inset 0 0 30px rgba(100,200,255,0.1);';
        document.body.appendChild(el);
      }
    } else {
      if (el) el.remove();
    }
  }

  function launchFireball() {
    const scene = FPSRenderer.getScene();
    const camera = FPSRenderer.getCamera();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();

    const geo = new THREE.SphereGeometry(1.5, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const fireball = new THREE.Mesh(geo, mat);
    fireball.position.copy(origin);
    const glow = new THREE.PointLight(0xff4400, 3, 15);
    fireball.add(glow);
    scene.add(fireball);

    const speed = 12;
    let dist = 0;
    const animate = () => {
      if (!active) { scene.remove(fireball); return; }
      dist += speed * 0.016;
      fireball.position.addScaledVector(dir, speed * 0.016);

      const dummyPos = dummyMesh.position.clone();
      dummyPos.y += 0.8;
      if (fireball.position.distanceTo(dummyPos) < 2) {
        Audio.play('fireballImpact');
        FPSEffects.explode(scene, fireball.position.clone(), 0xff4400);
        scene.remove(fireball);
        return;
      }

      if (dist >= 80) { scene.remove(fireball); return; }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  function launchAirstrike() {
    const scene = FPSRenderer.getScene();
    const targetPos = dummyMesh.position.clone();

    const markerGeo = new THREE.RingGeometry(4, 6, 24);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(targetPos.x, 0.15, targetPos.z);
    scene.add(marker);

    const bombGeo = new THREE.SphereGeometry(0.4, 6, 4);
    const bombMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const bomb = new THREE.Mesh(bombGeo, bombMat);
    bomb.position.set(targetPos.x, 25, targetPos.z);
    scene.add(bomb);

    const bombFall = () => {
      bomb.position.y -= 0.3;
      if (bomb.position.y > 0.5) requestAnimationFrame(bombFall);
    };
    setTimeout(() => requestAnimationFrame(bombFall), 1800);

    setTimeout(() => {
      scene.remove(marker);
      scene.remove(bomb);
      Audio.play('airstrikeBoom');
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x, 1, targetPos.z), 0xff4400);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x + 1, 0.5, targetPos.z - 1), 0xff8800);
    }, 2500);
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

  function updateUltHUD(now) {
    const key = document.getElementById('pg-ult-key');
    const status = document.getElementById('pg-ult-status');
    const timer = document.getElementById('pg-ult-timer');
    if (!key) return;
    if (ultReady) {
      key.classList.add('ready');
      status.classList.add('ready');
      status.textContent = 'READY';
      timer.textContent = '';
    } else {
      key.classList.remove('ready');
      status.classList.remove('ready');
      const remaining = Math.max(0, Math.ceil((ultCooldownEnd - now) / 1000));
      status.textContent = 'CHARGING';
      timer.textContent = remaining + 's';
    }
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
      delete canvas._pgHandlers;
    }

    FPSGun.destroy();
    FPSInput.releasePointerLock();
    FPSInput.clearAll();
    FPSShooting.setHitCallback(null);
    FPSShooting.reset();

    document.getElementById('pg-pause').classList.add('hidden');
    showScope(null);
    showCloakEffect(false);

    dummyMesh = null;
    dummyHealthBar = null;
    dummyFillMesh = null;
    coverMeshes = [];

    LobbyBG.init();
    Game.showScreen('lobby');
  }

  function isKnightUltActive() { return knightUltArrow; }
  function consumeKnightUlt() { knightUltArrow = false; }

  return { start, stop, isKnightUltActive, consumeKnightUlt };
})();
