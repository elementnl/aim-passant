const FPSAbilities = (() => {
  let pieceType = null;
  let duelStartTime = 0;
  let ultCooldownEnd = 0;
  let ultReady = false;
  let ultNotified = false;
  let active = false;

  const ULT_INITIAL_DELAY = 15000;
  const ULT_COOLDOWN = 30000;

  let passiveState = {};
  let disarmed = false;
  let flashed = false;
  let flashEndTime = 0;
  let knightUltArrow = false;
  let bishopResurrected = false;

  function init(piece, startTime) {
    pieceType = piece;
    duelStartTime = startTime;
    ultCooldownEnd = startTime + ULT_INITIAL_DELAY;
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
    ultCooldownEnd = performance.now() + ULT_COOLDOWN;

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

    Network.emit('duel-ability', { type: pieceType });
    executeUlt();
  }

  function executeUlt() {
    if (pieceType === 'p') {
      Audio.play('pawnFlashbang');
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
        Network.emit('duel-ability-effect', { effect: 'disarm' });
      }, 800);
    }

    if (pieceType === 'r') {
      Audio.play('rookCloak');
      Network.emit('duel-ability-effect', { effect: 'invisible' });
      showCloakOverlay(true);
      setTimeout(() => {
        Audio.play('whoosh');
        Network.emit('duel-ability-effect', { effect: 'visible' });
        showCloakOverlay(false);
      }, 3000);
    }

    if (pieceType === 'q') {
      Audio.play('fireballLaunch');
      launchFireball();
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

    if (effect === 'disarm') {
      disarmed = true;
      showDisarmOverlay(true);
      document.getElementById('crosshair').classList.add('hidden');
      Audio.play('bishopSpell');
      setTimeout(() => {
        disarmed = false;
        showDisarmOverlay(false);
        document.getElementById('crosshair').classList.remove('hidden');
      }, 3000);
    }

    if (effect === 'invisible') {
      Audio.play('rookCloak');
      FPSOpponent.setVisible(false);
    }

    if (effect === 'visible') {
      Audio.play('whoosh');
      FPSOpponent.setVisible(true);
    }

    if (effect === 'fireball') {
      spawnOpponentFireball(data);
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
    let el = document.getElementById('flash-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash-overlay';
      el.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:#fff;z-index:60;pointer-events:none;' +
        'transition:opacity 0.5s ease-in;opacity:1;';
      document.body.appendChild(el);
    }
    el.style.opacity = '1';
    Audio.play('pawnFlashbang');
    setTimeout(() => { if (el) el.style.opacity = '0.7'; }, 500);
    setTimeout(() => { if (el) el.style.opacity = '0.3'; }, 1500);
  }

  function hideFlashOverlay() {
    const el = document.getElementById('flash-overlay');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }
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
      bomb.position.y -= 0.3;
      if (bomb.position.y > 0.5) {
        requestAnimationFrame(bombFall);
      }
    };
    setTimeout(() => requestAnimationFrame(bombFall), 1800);

    setTimeout(() => {
      warningEl.remove();
      scene.remove(marker);
      scene.remove(inner);
      scene.remove(bomb);
      Audio.play('airstrikeBoom');

      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x, 1, targetPos.z), 0xff4400);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x + 1.5, 0.5, targetPos.z - 1), 0xff8800);
      FPSEffects.explode(scene, new THREE.Vector3(targetPos.x - 1, 1, targetPos.z + 1.5), 0xff6600);

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
      const radius = 6;
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const damage = Math.round(150 * falloff);
        if (damage > 0 && selfDamageCallback) {
          selfDamageCallback(damage);
        }
      }
    }, 2500);
  }

  function spawnExplosion(data) {
    const scene = FPSRenderer.getScene();
    const pos = new THREE.Vector3(data.x, data.y, data.z);
    Audio.play('explosionRocket');
    FPSEffects.explode(scene, pos, 0xff8800);

    const myPos = FPSPlayer.position;
    const dist = myPos.distanceTo(pos);
    const radius = 4;
    if (dist < radius) {
      const falloff = 1 - (dist / radius);
      const damage = Math.round(90 * falloff);
      if (damage > 0 && selfDamageCallback) {
        selfDamageCallback(damage);
      }
    }
  }

  function showKingAirstrikeLocal() {
    const scene = FPSRenderer.getScene();
    const opMesh = FPSOpponent.getMesh();
    if (!opMesh) return;

    const targetPos = new THREE.Vector3();
    opMesh.getWorldPosition(targetPos);

    const markerGeo = new THREE.RingGeometry(4, 6, 24);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    });
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
      if (bomb.position.y > 0.5) {
        requestAnimationFrame(bombFall);
      }
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

  function cleanup() {
    active = false;
    disarmed = false;
    flashed = false;
    passiveState = {};
    hideFlashOverlay();
    showDisarmOverlay(false);
    showForcefield(false);
    showCloakOverlay(false);
    const warning = document.getElementById('airstrike-warning');
    if (warning) warning.remove();
  }

  return {
    init, update, tryUlt, onOpponentAbility, onOpponentEffect,
    processDamage, isDisarmed, isFlashed, isKnightUltActive, consumeKnightUlt,
    canBishopResurrect, useBishopResurrect, setSelfDamageCallback,
    getPieceType, cleanup,
  };
})();
