const FPSAbilities = (() => {
  let pieceType = null;
  let duelStartTime = 0;
  let ultCooldownEnd = 0;
  let ultReady = false;
  let ultNotified = false;
  let active = false;

  function isInPlayground() {
    return document.getElementById('screen-playground')?.classList.contains('active');
  }
  const ULT_INITIAL_DELAY_NORMAL = 15000;
  const ULT_COOLDOWN_NORMAL = 30000;
  const ULT_INITIAL_DELAY_PG = 3000;
  const ULT_COOLDOWN_PG = 5000;

  let passiveState = {};
  let disarmed = false;
  let flashed = false;
  let flashEndTime = 0;
  let knightUltArrow = false;
  let bishopResurrected = false;

  function init(piece, startTime) {
    pieceType = piece;
    duelStartTime = startTime;
    ultCooldownEnd = startTime + (isInPlayground() ? ULT_INITIAL_DELAY_PG : ULT_INITIAL_DELAY_NORMAL);
    ultReady = false;
    ultNotified = false;
    active = true;
    disarmed = false;
    flashed = false;
    flashEndTime = 0;
    knightUltArrow = false;
    bishopResurrected = false;
    passiveState = {};

    if (pieceType === 'p') passiveState.regenTimer = 0;
    if (pieceType === 'n') {
      passiveState.doubleJumpUsed = false;
      passiveState.jumpKeyWasDown = true;
    }
    if (pieceType === 'r') {
      passiveState.headshotImmune = true;
      passiveState.bodyShotsAbsorbed = 0;
    }
    if (pieceType === 'q') {
      passiveState.wallhackTimer = 0;
      passiveState.wallhackActive = false;
      passiveState.wallhackDuration = 0;
    }
    if (pieceType === 'k') {
      passiveState.shieldTimer = 0;
      passiveState.shieldActive = false;
      passiveState.shieldDuration = 0;
    }

    FPSHUD.initAbilityHUD(pieceType);
  }

  function update(dt) {
    if (!active) return;

    const now = performance.now();

    if (!ultReady && now >= ultCooldownEnd) {
      ultReady = true;
      if (!ultNotified) {
        Audio.play('ultReady');
        ultNotified = true;
      }
    }

    if (flashed && now >= flashEndTime) {
      flashed = false;
      hideFlashOverlay();
    }

    updatePassive(dt, now);
    FPSHUD.updateAbilityHUD(ultReady, ultCooldownEnd, now);
  }

  function updatePassive(dt, now) {
    if (pieceType === 'p') {
      passiveState.regenTimer += dt;
      if (passiveState.regenTimer >= 2) {
        passiveState.regenTimer = 0;
        return { type: 'regen', amount: 3 };
      }
    }


    if (pieceType === 'q') {
      passiveState.wallhackTimer += dt;
      if (passiveState.wallhackActive) {
        passiveState.wallhackDuration += dt;
        if (passiveState.wallhackDuration >= 1) {
          passiveState.wallhackActive = false;
          passiveState.wallhackDuration = 0;
          FPSOpponent.setOutline(false);
        }
      } else if (passiveState.wallhackTimer >= 10) {
        passiveState.wallhackTimer = 0;
        passiveState.wallhackActive = true;
        passiveState.wallhackDuration = 0;
        Audio.play('wallhackPulse');
        FPSOpponent.setOutline(true);
      }
    }

    if (pieceType === 'k') {
      passiveState.shieldTimer += dt;
      if (passiveState.shieldActive) {
        passiveState.shieldDuration += dt;
        if (passiveState.shieldDuration >= 3) {
          passiveState.shieldActive = false;
          passiveState.shieldDuration = 0;
          Audio.play('whoosh');
          showForcefield(false);
        }
      } else if (passiveState.shieldTimer >= 15) {
        passiveState.shieldTimer = 0;
        passiveState.shieldActive = true;
        passiveState.shieldDuration = 0;
        Audio.play('forcefieldOn');
        showForcefield(true);
      }
    }
  }

  function tryUlt() {
    if (!active || !ultReady || disarmed) return;
    ultReady = false;
    ultNotified = false;
    ultCooldownEnd = performance.now() + (isInPlayground() ? ULT_COOLDOWN_PG : ULT_COOLDOWN_NORMAL);

    const voiceLines = {
      p: 'voicePawnUlt',
      n: ['voiceKnightHorse', 'voiceKnightUlt'],
      b: 'voiceBishopUlt',
      r: 'voiceRookUlt',
      q: 'voiceQueenUlt',
      k: 'voiceKingUlt',
    };

    const voice = voiceLines[pieceType];
    if (Array.isArray(voice)) {
      voice.forEach(v => Audio.play(v));
    } else if (voice) {
      Audio.play(voice);
    }

    const ultNames = { p: 'Flashbang', n: 'Explosive Arrow', b: 'Soul Pull', r: 'Freeze', q: 'Ring of Fire', k: 'Airstrike' };
    KillFeed.ability(true, ultNames[pieceType] || 'Ultimate');

    Network.emit('duel-ability', { type: pieceType });
    executeUlt();
  }

  function executeUlt() {
    if (pieceType === 'p') {
      Audio.play('pawnFlashbang');
      throwGrenade();
      setTimeout(() => {
        Network.emit('duel-ability-effect', { effect: 'flash' });
      }, 1000);
    }

    if (pieceType === 'n') {
      knightUltArrow = true;
    }

    if (pieceType === 'b') {
      Audio.play('bishopSpell');
      spawnBishopBeam();
      Network.emit('duel-ability-effect', { effect: 'bishopBeam' });
      setTimeout(() => {
        const myPos = FPSPlayer.position;
        Network.emit('duel-ability-effect', {
          effect: 'pull',
          data: { x: myPos.x, y: myPos.y, z: myPos.z },
        });
      }, 600);
    }

    if (pieceType === 'r') {
      Audio.play('rookCloak');
      Network.emit('duel-ability-effect', { effect: 'freeze' });
    }

    if (pieceType === 'q') {
      Audio.play('fireballLaunch');
      launchRingOfFire();
    }

    if (pieceType === 'k') {
      Audio.play('airstrikeCall');
      Network.emit('duel-ability-effect', { effect: 'airstrike' });
      showKingAirstrikeLocal();
    }
  }

  function onOpponentAbility({ type }) {
    const voice = {
      p: 'voicePawnUlt',
      n: ['voiceKnightHorse', 'voiceKnightUlt'],
      b: 'voiceBishopUlt',
      r: 'voiceRookUlt',
      q: 'voiceQueenUlt',
      k: 'voiceKingUlt',
    }[type];
    if (Array.isArray(voice)) {
      voice.forEach(v => Audio.play(v));
    } else if (voice) {
      Audio.play(voice);
    }
    const ultNames = { p: 'Flashbang', n: 'Explosive Arrow', b: 'Soul Pull', r: 'Freeze', q: 'Ring of Fire', k: 'Airstrike' };
    KillFeed.ability(false, ultNames[type] || 'Ultimate');
  }

  function onOpponentEffect({ effect, data }) {
    if (effect === 'flash') {
      flashed = true;
      flashEndTime = performance.now() + 2000;
      showFlashOverlay();
    }

    if (effect === 'bishopBeam') {
      Audio.play('bishopSpell');
      spawnBishopBeamFromOpponent();
    }

    if (effect === 'bishopResurrect') {
      Audio.play('bishopResurrect');
      const opMesh = FPSOpponent.getMesh();
      if (opMesh) {
        FPSEffects.explode(FPSRenderer.getScene(), opMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x9944ff);
      }
      const msg = document.createElement('div');
      msg.style.cssText =
        'position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);' +
        'color:#bb88ff;font-size:1.5rem;font-weight:bold;z-index:55;' +
        'pointer-events:none;text-shadow:0 0 20px rgba(155,89,182,0.6);letter-spacing:3px;';
      msg.textContent = 'OPPONENT RESURRECTING...';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }

    if (effect === 'pull') {
      applyPull(data);
    }

    if (effect === 'freeze') {
      applyFreeze();
    }

    if (effect === 'ringOfFire') {
      spawnOpponentRingOfFire(data);
    }

    if (effect === 'airstrike') {
      triggerAirstrike();
    }

    if (effect === 'explosiveArrow') {
      spawnExplosion(data);
    }
  }

  function processDamage(damage, isHeadshot) {
    if (pieceType === 'r') {
      if (isHeadshot && passiveState.headshotImmune) {
        passiveState.headshotImmune = false;
        passiveState.bodyShotsAbsorbed = 999;
        return 0;
      }
      if (!isHeadshot && passiveState.bodyShotsAbsorbed < 2) {
        passiveState.bodyShotsAbsorbed++;
        if (passiveState.bodyShotsAbsorbed >= 2) {
          passiveState.headshotImmune = false;
        }
        return 0;
      }
    }

    if (pieceType === 'k' && passiveState.shieldActive) {
      return 0;
    }

    return damage;
  }

  function isDisarmed() { return disarmed; }
  function isFlashed() { return flashed; }
  function getPieceType() { return pieceType; }
  function canBishopResurrect() { return pieceType === 'b' && !bishopResurrected; }
  function useBishopResurrect() { bishopResurrected = true; }

  function isKnightUltActive() {
    return knightUltArrow;
  }

  function consumeKnightUlt() {
    knightUltArrow = false;
  }

  function showFlashOverlay() {
    hideFlashOverlay();
    const el = document.createElement('div');
    el.id = 'flash-overlay';
    el.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:#fff;z-index:60;pointer-events:none;opacity:1;';
    document.body.appendChild(el);
    Audio.play('pawnFlashbang');

    const fade = () => {
      if (!document.getElementById('flash-overlay')) return;
      const remaining = flashEndTime - performance.now();
      if (remaining <= 0) {
        hideFlashOverlay();
        return;
      }
      const pct = remaining / 2000;
      el.style.opacity = String(Math.min(1, pct * 1.5));
      requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }

  function hideFlashOverlay() {
    const el = document.getElementById('flash-overlay');
    if (el) el.remove();
  }

  function showDisarmOverlay(show) {
    let el = document.getElementById('disarm-overlay');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'disarm-overlay';
        el.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;z-index:55;' +
          'pointer-events:none;' +
          'background:radial-gradient(circle,transparent 30%,rgba(155,89,182,0.2) 100%);';
        const text = document.createElement('div');
        text.style.cssText =
          'position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);' +
          'color:#9b59b6;font-size:1.8rem;font-weight:bold;' +
          'text-shadow:0 0 30px rgba(155,89,182,0.6);letter-spacing:4px;';
        text.textContent = 'DISARMED';
        el.appendChild(text);
        document.body.appendChild(el);
      }
    } else {
      if (el) el.remove();
    }
  }

  function showCloakOverlay(show) {
    let el = document.getElementById('cloak-overlay');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'cloak-overlay';
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

  function showForcefield(show) {
    let el = document.getElementById('forcefield-overlay');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'forcefield-overlay';
        el.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;' +
          'border:3px solid rgba(52,152,219,0.4);pointer-events:none;z-index:11;' +
          'box-shadow:inset 0 0 40px rgba(52,152,219,0.15);';
        document.body.appendChild(el);
      }
    } else {
      if (el) el.remove();
    }
  }

  function launchFireball() {
    const camera = FPSRenderer.getCamera();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();

    Network.emit('duel-ability-effect', {
      effect: 'fireball',
      data: { x: origin.x, y: origin.y, z: origin.z, dx: dir.x, dy: dir.y, dz: dir.z },
    });

    spawnFireball(FPSRenderer.getScene(), origin, dir, true);
  }

  function spawnFireball(scene, origin, dir, isMine) {
    const geo = new THREE.SphereGeometry(1.5, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const fireball = new THREE.Mesh(geo, mat);
    fireball.position.copy(origin);

    const glow = new THREE.PointLight(0xff4400, 3, 15);
    fireball.add(glow);

    scene.add(fireball);

    const speed = 12;
    const maxDist = 80;
    let dist = 0;

    const animate = () => {
      if (!active) { scene.remove(fireball); return; }
      dist += speed * 0.016;
      fireball.position.addScaledVector(dir, speed * 0.016);

      if (isMine) {
        const opMesh = FPSOpponent.getMesh();
        if (opMesh) {
          const opPos = new THREE.Vector3();
          opMesh.getWorldPosition(opPos);
          if (fireball.position.distanceTo(opPos) < 1.5) {
            Network.sendDuelHit(100, false, FPS.getMyHP());
            FPSOpponent.flashWhite();
            FPSOpponent.takeDamage(100);
            Audio.play('fireballImpact');
            FPSEffects.explode(scene, fireball.position.clone(), 0xff4400);
            scene.remove(fireball);
            return;
          }
        }
      }

      if (dist >= maxDist) {
        scene.remove(fireball);
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  function spawnOpponentFireball(data) {
    const origin = new THREE.Vector3(data.x, data.y, data.z);
    const dir = new THREE.Vector3(data.dx, data.dy, data.dz).normalize();
    spawnFireball(FPSRenderer.getScene(), origin, dir, false);
  }

  let selfDamageCallback = null;

  function setSelfDamageCallback(cb) { selfDamageCallback = cb; }

  function triggerAirstrike() {
    Audio.play('airstrikeCall');
    const targetPos = FPSPlayer.position.clone();
    const scene = FPSRenderer.getScene();

    const warningEl = document.createElement('div');
    warningEl.id = 'airstrike-warning';
    warningEl.style.cssText =
      'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);' +
      'color:#e74c3c;font-size:2.5rem;font-weight:bold;z-index:55;' +
      'pointer-events:none;text-shadow:0 0 20px rgba(231,76,60,0.8);' +
      'letter-spacing:3px;animation:reloadBlink 0.3s ease-in-out infinite;';
    warningEl.textContent = '⚠ AIRSTRIKE INCOMING ⚠';
    document.body.appendChild(warningEl);

    const markerGeo = new THREE.RingGeometry(4, 6, 24);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(targetPos.x, 0.15, targetPos.z);
    scene.add(marker);

    const innerGeo = new THREE.CircleGeometry(4, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(targetPos.x, 0.12, targetPos.z);
    scene.add(inner);

    let blinkTime = 0;
    const blinkMarker = () => {
      if (blinkTime > 2.4) return;
      blinkTime += 0.016;
      markerMat.opacity = 0.3 + Math.sin(blinkTime * 8) * 0.2;
      requestAnimationFrame(blinkMarker);
    };
    requestAnimationFrame(blinkMarker);

    const bombGeo = new THREE.SphereGeometry(0.4, 6, 4);
    const bombMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const bomb = new THREE.Mesh(bombGeo, bombMat);
    bomb.position.set(targetPos.x, 25, targetPos.z);
    scene.add(bomb);

    const bombFall = () => {
      bomb.position.y -= 0.6;
      if (bomb.position.y > 0.5) {
        requestAnimationFrame(bombFall);
      }
    };
    setTimeout(() => requestAnimationFrame(bombFall), 400);

    setTimeout(() => {
      warningEl.remove();
      scene.remove(marker);
      scene.remove(inner);
      scene.remove(bomb);
      Audio.play('airstrikeBoom');

      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x, 1, targetPos.z), 0xff4400);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x + 2, 0.5, targetPos.z - 1.5), 0xff8800);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x - 1.5, 1, targetPos.z + 2), 0xff6600);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x, 2, targetPos.z), 0xff4400);

      const flashEl = document.createElement('div');
      flashEl.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(255,100,0,0.3);pointer-events:none;z-index:50;';
      document.body.appendChild(flashEl);
      setTimeout(() => flashEl.remove(), 200);

      const myPos = FPSPlayer.position;
      const dist = Math.sqrt(
        (myPos.x - targetPos.x) ** 2 + (myPos.z - targetPos.z) ** 2
      );
      const radius = 8;
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const damage = Math.round(180 * falloff);
        if (damage > 0 && selfDamageCallback) {
          selfDamageCallback(damage);
        }
      }
    }, 1000);
  }

  function spawnExplosion(data) {
    const scene = FPSRenderer.getScene();
    const pos = new THREE.Vector3(data.x, data.y, data.z);
    Audio.play('explosionRocket');
    FPSEffects.explode(scene, pos, 0xff8800);

    const myPos = FPSPlayer.position;
    const dist = myPos.distanceTo(pos);
    const radius = 5;
    if (dist < radius) {
      if (selfDamageCallback) {
        selfDamageCallback(150);
      }
    }
  }

  function showKingAirstrikeLocal() {
    const scene = FPSRenderer.getScene();
    const opMesh = FPSOpponent.getMesh();
    if (!opMesh) return;

    const targetPos = new THREE.Vector3();
    opMesh.getWorldPosition(targetPos);

    const markerGeo = new THREE.RingGeometry(5, 8, 24);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(targetPos.x, 0.15, targetPos.z);
    scene.add(marker);

    const bombGeo = new THREE.SphereGeometry(0.5, 6, 4);
    const bombMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const bomb = new THREE.Mesh(bombGeo, bombMat);
    bomb.position.set(targetPos.x, 25, targetPos.z);
    scene.add(bomb);

    const bombFall = () => {
      bomb.position.y -= 0.6;
      if (bomb.position.y > 0.5) requestAnimationFrame(bombFall);
    };
    setTimeout(() => requestAnimationFrame(bombFall), 400);

    setTimeout(() => {
      scene.remove(marker);
      scene.remove(bomb);
      Audio.play('airstrikeBoom');
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x, 1, targetPos.z), 0xff4400);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x + 2, 0.5, targetPos.z - 1.5), 0xff8800);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x - 1.5, 1, targetPos.z + 2), 0xff6600);

      const myPos = FPSPlayer.position;
      const dist = Math.sqrt(
        (myPos.x - targetPos.x) ** 2 + (myPos.z - targetPos.z) ** 2
      );
      const radius = 8;
      if (dist < radius && selfDamageCallback) {
        const falloff = 1 - (dist / radius);
        const damage = Math.round(180 * falloff);
        if (damage > 0) selfDamageCallback(damage);
      }
    }, 1000);
  }

  function spawnBishopBeamFromOpponent() {
    const scene = FPSRenderer.getScene();
    const opMesh = FPSOpponent.getMesh();
    if (!opMesh) return;

    const start = new THREE.Vector3();
    opMesh.getWorldPosition(start);
    start.y += 0.8;
    const end = FPSPlayer.position.clone();

    spawnBeamBetween(scene, start, end);
  }

  function spawnBishopBeam() {
    const scene = FPSRenderer.getScene();
    const camera = FPSRenderer.getCamera();
    const opMesh = FPSOpponent.getMesh();
    if (!opMesh) return;

    const start = camera.position.clone();
    const end = new THREE.Vector3();
    opMesh.getWorldPosition(end);
    end.y += 0.8;

    spawnBeamBetween(scene, start, end);
  }

  function spawnBeamBetween(scene, start, end) {
    const mid = start.clone().lerp(end, 0.5);
    const length = start.distanceTo(end);

    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, length, 6);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xbb88ff, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(mid);
    beam.lookAt(end);
    beam.rotateX(Math.PI / 2);

    const glowGeo = new THREE.CylinderGeometry(0.2, 0.2, length, 6);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x9944ff, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(mid);
    glow.lookAt(end);
    glow.rotateX(Math.PI / 2);

    const light = new THREE.PointLight(0x9944ff, 2, 10);
    light.position.copy(end);

    scene.add(beam);
    scene.add(glow);
    scene.add(light);

    let life = 0.6;
    const fadeBeam = () => {
      life -= 0.016;
      const opacity = Math.max(0, life / 0.6);
      beamMat.opacity = 0.8 * opacity;
      glowMat.opacity = 0.3 * opacity;
      light.intensity = 2 * opacity;
      if (life > 0) {
        requestAnimationFrame(fadeBeam);
      } else {
        scene.remove(beam);
        scene.remove(glow);
        scene.remove(light);
      }
    };
    setTimeout(fadeBeam, 200);
  }

  function throwGrenade() {
    const scene = FPSRenderer.getScene();
    const camera = FPSRenderer.getCamera();
    const origin = camera.position.clone();

    let targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const opMesh = FPSOpponent.getMesh();
    if (opMesh) {
      const opPos = new THREE.Vector3();
      opMesh.getWorldPosition(opPos);
      targetDir = opPos.sub(origin).normalize();
    }

    const grenadeMat = new THREE.MeshLambertMaterial({ color: 0x445522 });
    const grenade = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 6), grenadeMat);
    grenade.add(body);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0x666644 })
    );
    cap.position.y = 0.05;
    grenade.add(cap);

    const startPos = origin.clone().add(targetDir.clone().multiplyScalar(0.5));
    startPos.y -= 0.2;
    grenade.position.copy(startPos);
    scene.add(grenade);

    const vel = targetDir.clone().multiplyScalar(10);
    vel.y += 5;
    let time = 0;

    const animate = () => {
      time += 0.016;
      vel.y -= 12 * 0.016;
      grenade.position.addScaledVector(vel, 0.016);
      grenade.rotation.x += 8 * 0.016;
      grenade.rotation.z += 3 * 0.016;

      if (grenade.position.y <= 0.1 || time >= 1) {
        const flashGeo = new THREE.SphereGeometry(0.5, 8, 6);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(grenade.position);
        flash.position.y += 0.5;
        scene.add(flash);
        scene.remove(grenade);

        const light = new THREE.PointLight(0xffffff, 3, 15);
        light.position.copy(flash.position);
        scene.add(light);

        let fadeTime = 0;
        const fadeFlash = () => {
          fadeTime += 0.016;
          flash.scale.setScalar(1 + fadeTime * 2);
          flashMat.opacity = Math.max(0, 0.9 - fadeTime * 4);
          light.intensity = Math.max(0, 3 - fadeTime * 12);
          if (fadeTime < 0.3) {
            requestAnimationFrame(fadeFlash);
          } else {
            scene.remove(flash);
            scene.remove(light);
          }
        };
        requestAnimationFrame(fadeFlash);
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  let frozen = false;
  let pulled = false;

  function applyPull(data) {
    Audio.play('bishopSpell');
    pulled = true;
    const bishopPos = new THREE.Vector3(data.x, data.y, data.z);
    const pullSpeed = 8;
    const pullDuration = 3000;
    const startTime = performance.now();

    showPullOverlay(true);

    const pullInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= pullDuration) {
        clearInterval(pullInterval);
        showPullOverlay(false);
        pulled = false;
        return;
      }

      const myPos = FPSPlayer.position;
      const toBishop = bishopPos.clone().sub(myPos);
      toBishop.y = 0;
      const dist = toBishop.length();

      if (dist < 2) {
        clearInterval(pullInterval);
        showPullOverlay(false);
        pulled = false;
        return;
      }

      toBishop.normalize();
      const step = pullSpeed * 0.016;
      const newX = myPos.x + toBishop.x * step;
      const newZ = myPos.z + toBishop.z * step;

      const colliders = FPSArena.getColliders();
      let blocked = false;
      const R = 0.3;
      for (const c of colliders) {
        if (newX + R > c.minX && newX - R < c.maxX &&
            newZ + R > c.minZ && newZ - R < c.maxZ &&
            myPos.y > c.minY && myPos.y - 1.6 < c.maxY) {
          blocked = true;
          break;
        }
      }

      if (blocked) {
        FPSArena.damageAt(new THREE.Vector3(newX, myPos.y - 0.8, newZ), 999);
      } else {
        myPos.x = newX;
        myPos.z = newZ;
      }
    }, 16);
  }

  function showPullOverlay(show) {
    let el = document.getElementById('pull-overlay');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'pull-overlay';
        el.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;z-index:55;' +
          'pointer-events:none;' +
          'background:radial-gradient(circle,transparent 30%,rgba(155,89,182,0.15) 100%);';
        document.body.appendChild(el);
      }
    } else {
      if (el) el.remove();
    }
  }

  function applyFreeze() {
    Audio.play('rookCloak');
    frozen = true;
    passiveState.frozen = true;

    let el = document.getElementById('freeze-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'freeze-overlay';
      el.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;z-index:55;' +
        'pointer-events:none;' +
        'background:rgba(100,180,255,0.2);' +
        'border:4px solid rgba(100,180,255,0.4);';
      const text = document.createElement('div');
      text.style.cssText =
        'position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);' +
        'color:#88ccff;font-size:1.8rem;font-weight:bold;' +
        'text-shadow:0 0 30px rgba(100,180,255,0.6);letter-spacing:4px;';
      text.textContent = 'FROZEN';
      el.appendChild(text);
      document.body.appendChild(el);
    }

    setTimeout(() => {
      frozen = false;
      passiveState.frozen = false;
      Audio.play('whoosh');
      const overlay = document.getElementById('freeze-overlay');
      if (overlay) overlay.remove();
    }, 2000);
  }

  function isFrozen() { return frozen; }
  function isPulled() { return pulled; }

  function launchRingOfFire() {
    const scene = FPSRenderer.getScene();
    const origin = FPSPlayer.position.clone();
    origin.y = 0.5;

    Network.emit('duel-ability-effect', {
      effect: 'ringOfFire',
      data: { x: origin.x, y: origin.y, z: origin.z },
    });

    spawnRingOfFire(scene, origin, true);
  }

  function spawnOpponentRingOfFire(data) {
    const scene = FPSRenderer.getScene();
    const origin = new THREE.Vector3(data.x, data.y, data.z);
    Audio.play('fireballLaunch');
    spawnRingOfFire(scene, origin, false);
  }

  function spawnRingOfFire(scene, origin, isMine) {
    const ringSpeed = 10;
    const maxRadius = 30;
    const ringHeight = 3;
    const ringThickness = 0.8;
    const damage = 210;
    let currentRadius = 1;
    let hasHit = false;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3300, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    });
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff6600, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    });
    let ringMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, ringHeight, 24, 1, true),
      ringMat
    );
    ringMesh.position.set(origin.x, ringHeight / 2, origin.z);
    scene.add(ringMesh);

    let innerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, ringHeight * 0.6, 24, 1, true),
      innerMat
    );
    innerRing.position.set(origin.x, ringHeight * 0.3, origin.z);
    scene.add(innerRing);

    const light = new THREE.PointLight(0xff4400, 4, 20);
    light.position.set(origin.x, ringHeight / 2, origin.z);
    scene.add(light);

    const animate = () => {
      if (!active && !isMine) {
        scene.remove(ringMesh); scene.remove(innerRing); scene.remove(light); return;
      }

      currentRadius += ringSpeed * 0.016;

      ringMesh.geometry.dispose();
      ringMesh.geometry = new THREE.CylinderGeometry(
        currentRadius, currentRadius, ringHeight, 24, 1, true
      );
      innerRing.geometry.dispose();
      innerRing.geometry = new THREE.CylinderGeometry(
        Math.max(0, currentRadius - ringThickness),
        Math.max(0, currentRadius - ringThickness),
        ringHeight * 0.6, 24, 1, true
      );

      const fade = Math.max(0, 1 - (currentRadius / maxRadius) * 0.7);
      ringMat.opacity = 0.9 * fade;
      innerMat.opacity = 0.7 * fade;

      light.intensity = Math.max(0, 3 * (1 - currentRadius / maxRadius));

      if (!isMine && !hasHit) {
        const myPos = FPSPlayer.position;
        const dist2D = Math.sqrt(
          (myPos.x - origin.x) ** 2 + (myPos.z - origin.z) ** 2
        );
        const isInRing = Math.abs(dist2D - currentRadius) < 1.5;
        const isAboveRing = myPos.y - 1.6 > ringHeight;

        if (isInRing && !isAboveRing) {
          let blocked = false;
          const colliders = FPSArena.getColliders();
          const dirToPlayer = new THREE.Vector2(
            myPos.x - origin.x, myPos.z - origin.z
          );
          const distToPlayer = dirToPlayer.length();
          dirToPlayer.normalize();

          const steps = Math.max(10, Math.ceil(distToPlayer));
          for (let s = 0; s <= steps && !blocked; s++) {
            const t = (s / steps) * distToPlayer;
            const checkX = origin.x + dirToPlayer.x * t;
            const checkZ = origin.z + dirToPlayer.y * t;
            for (const c of colliders) {
              if (checkX > c.minX && checkX < c.maxX &&
                  checkZ > c.minZ && checkZ < c.maxZ &&
                  origin.y < c.maxY && origin.y + ringHeight > c.minY) {
                blocked = true;
                break;
              }
            }
          }

          if (!blocked) {
            hasHit = true;
            if (selfDamageCallback) selfDamageCallback(damage);
          }
        }
      }

      if (isMine) {
        FPSArena.damageAt(
          new THREE.Vector3(origin.x + currentRadius, 1, origin.z), 25
        );
        FPSArena.damageAt(
          new THREE.Vector3(origin.x - currentRadius, 1, origin.z), 25
        );
        FPSArena.damageAt(
          new THREE.Vector3(origin.x, 1, origin.z + currentRadius), 25
        );
        FPSArena.damageAt(
          new THREE.Vector3(origin.x, 1, origin.z - currentRadius), 25
        );
      }

      if (currentRadius >= maxRadius) {
        scene.remove(ringMesh);
        scene.remove(innerRing);
        scene.remove(light);
        ringMesh.geometry.dispose();
        innerRing.geometry.dispose();
        return;
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  function cleanup() {
    active = false;
    disarmed = false;
    flashed = false;
    frozen = false;
    pulled = false;
    passiveState = {};
    hideFlashOverlay();
    showDisarmOverlay(false);
    showForcefield(false);
    showCloakOverlay(false);
    showPullOverlay(false);
    const warning = document.getElementById('airstrike-warning');
    if (warning) warning.remove();
    const freezeOv = document.getElementById('freeze-overlay');
    if (freezeOv) freezeOv.remove();
  }

  return {
    init, update, tryUlt, onOpponentAbility, onOpponentEffect,
    processDamage, isDisarmed, isFlashed, isFrozen, isPulled, isKnightUltActive, consumeKnightUlt,
    canBishopResurrect, useBishopResurrect, setSelfDamageCallback,
    getPieceType, cleanup,
  };
})();
