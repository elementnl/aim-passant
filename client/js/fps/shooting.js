const FPSShooting = (() => {
  let lastShotTime = 0;
  const activeBullets = [];
  let ammo = 12;
  let maxAmmo = 12;
  let isReloading = false;
  let weapon = null;
  let charging = false;
  let chargeStart = 0;
  let mouseHeld = false;
  let pumpPending = false;
  let boltPending = false;
  let minigunSpunUp = false;
  let minigunSpinStart = 0;
  let minigunFireLoop = null;

  let bloom = 0;
  let recoilOffsetX = 0;
  let recoilOffsetY = 0;
  const BLOOM_WEAPONS = ['pistol', 'ar', 'deagle', 'shotgun', 'minigun'];
  const BLOOM_CONFIG = {
    pistol:  { perShot: 0.008, max: 0.04,  decay: 0.06,  recoilUp: 0.003, recoilSide: 0.001 },
    ar:      { perShot: 0.006, max: 0.07,  decay: 0.035, recoilUp: 0.004, recoilSide: 0.002 },
    deagle:  { perShot: 0.015, max: 0.05,  decay: 0.06,  recoilUp: 0.005, recoilSide: 0.002 },
    shotgun: { perShot: 0.01,  max: 0.03,  decay: 0.05,  recoilUp: 0.004, recoilSide: 0.001 },
    minigun: { perShot: 0.003, max: 0.06,  decay: 0.03,  recoilUp: 0.002, recoilSide: 0.003 },
  };
  const BASE_CROSSHAIR_SIZE = {
    pistol: 24, bow: 22, shotgun: 110, sniper: 360, ar: 24, deagle: 26, minigun: 30,
  };

  const BULLET_SPEED = 80;
  const BULLET_MAX_DIST = 60;
  const BULLET_SIZE = 0.06;
  let onHitCallback = null;

  function setHitCallback(cb) { onHitCallback = cb; }

  function isPlayground() {
    return document.getElementById('screen-playground')?.classList.contains('active');
  }

  function checkKnightUlt() {
    return isPlayground() ? Playground.isKnightUltActive() : FPSAbilities.isKnightUltActive();
  }

  function consumeKnightUltCheck() {
    if (isPlayground()) Playground.consumeKnightUlt();
    else FPSAbilities.consumeKnightUlt();
  }

  function getCrosshair() {
    return isPlayground()
      ? document.getElementById('crosshair-pg')
      : document.getElementById('crosshair');
  }

  function init(stats) {
    weapon = stats.weapon;
    maxAmmo = (weapon.magSize === null || weapon.magSize === undefined) ? Infinity : weapon.magSize;
    ammo = maxAmmo === Infinity ? Infinity : maxAmmo;
    isReloading = false;
    charging = false;
    mouseHeld = false;
    pumpPending = false;
    boltPending = false;
    minigunSpunUp = false;
    minigunSpinStart = 0;
    Audio.stop('minigunFire');
    Audio.stop('minigunSpinup');
    bloom = 0;
    recoilOffsetX = 0;
    recoilOffsetY = 0;
    lastShotTime = 0;
    const crosshair = getCrosshair();
    if (crosshair) {
      const base = BASE_CROSSHAIR_SIZE[weapon.type] || 24;
      crosshair.style.width = base + 'px';
      crosshair.style.height = base + 'px';
      crosshair.style.transform = 'translate(-50%, -50%)';
    }
  }

  function onMouseDown(camera, opponentMesh, stats, coverMeshes) {
    mouseHeld = true;
    if ((!isPlayground() && FPSAbilities.isDisarmed())) return;
    if (weapon.type === 'bow') {
      startCharge();
      return;
    }
    if (weapon.type === 'minigun') {
      if (isReloading || FPSGun.isReloading()) return;
      if (ammo <= 0) { Audio.play('emptyClick'); return; }
      minigunSpunUp = false;
      minigunSpinStart = performance.now();
      Audio.play('minigunSpinup');
      FPSGun.setMinigunSpinup(true);
      return;
    }
    if (isReloading && weapon.reloadPerShell && ammo > 0) {
      cancelReload();
    }
    tryShoot(camera, opponentMesh, stats, coverMeshes);
  }

  function onMouseUp(camera, opponentMesh, stats, coverMeshes) {
    mouseHeld = false;
    if (weapon.type === 'bow' && charging) {
      releaseBow(camera, opponentMesh, stats, coverMeshes);
    }
    if (weapon.type === 'minigun') {
      Audio.stop('minigunSpinup');
      if (minigunSpunUp) {
        if (minigunFireLoop) { minigunFireLoop.pause(); minigunFireLoop = null; }
        Audio.stop('minigunFire');
        Audio.play('minigunWinddown');
      }
      minigunSpunUp = false;
      FPSGun.setMinigunSpin(false);
      FPSGun.setMinigunSpinup(false);
    }
  }

  function onMouseHeld(camera, opponentMesh, stats, coverMeshes) {
    if (!mouseHeld || (!isPlayground() && FPSAbilities.isDisarmed())) return;
    if (weapon.type === 'minigun') {
      if (isReloading || FPSGun.isReloading()) return;
      const elapsed = performance.now() - minigunSpinStart;
      if (!minigunSpunUp && elapsed >= (weapon.spinupTime || 500)) {
        minigunSpunUp = true;
        Audio.stop('minigunSpinup');
        FPSGun.setMinigunSpin(true);
        minigunFireLoop = Audio.play('minigunFire');
        if (minigunFireLoop) minigunFireLoop.loop = true;
      }
      if (minigunSpunUp) {
        if (ammo <= 0) {
          minigunSpunUp = false;
          if (minigunFireLoop) { minigunFireLoop.pause(); minigunFireLoop = null; }
          Audio.stop('minigunFire');
          Audio.play('minigunWinddown');
          FPSGun.setMinigunSpin(false);
          showOutOfAmmo();
          Audio.play('outOfAmmo');
          return;
        }
        tryShoot(camera, opponentMesh, stats, coverMeshes);
      }
      return;
    }
    if (!weapon.auto) return;
    tryShoot(camera, opponentMesh, stats, coverMeshes);
  }

  function startCharge() {
    if (isReloading || FPSGun.isReloading()) return;
    charging = true;
    chargeStart = performance.now();
    if (checkKnightUlt()) {
      Audio.play('knightUltCharge');
    } else {
      Audio.play('bowDraw');
    }
    FPSHUD.showChargeBar(true);
    FPSGun.setBowDraw(0);
  }

  function releaseBow(camera, opponentMesh, stats, coverMeshes) {
    if (!charging) return;
    const chargeTime = performance.now() - chargeStart;
    charging = false;
    FPSHUD.showChargeBar(false);

    if (chargeTime < (weapon.minChargeTime || 400)) {
      FPSGun.setBowDraw(0);
      return;
    }

    const chargePercent = Math.min(chargeTime / weapon.chargeTime, 1);
    const isExplosive = checkKnightUlt();
    const damage = isExplosive ? 150 : weapon.damageMin + (weapon.damageMax - weapon.damageMin) * chargePercent;

    FPSGun.bowRelease();
    Audio.stop('knightUltCharge');
    Audio.stop('bowDraw');
    Audio.play(isExplosive ? 'knightUltShot' : 'bowRelease');
    if (isExplosive) consumeKnightUltCheck();
    fireArrow(camera, opponentMesh, Math.round(damage), coverMeshes, isExplosive);
    Network.sendDuelShoot(FPSPlayer.getState());
  }

  function fireArrow(camera, opponentMesh, damage, coverMeshes, explosive) {
    if (!explosive) {
      fireBullet(camera, opponentMesh, damage, 0, coverMeshes);
      return;
    }

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone().add(dir.clone().multiplyScalar(0.8));
    const scene = FPSRenderer.getScene();

    const arrowGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    const glow = new THREE.PointLight(0xff4400, 2, 8);
    arrow.add(glow);
    arrow.position.copy(origin);
    scene.add(arrow);

    const speed = 35;
    let dist = 0;
    const half = FPSConfig.ARENA_SIZE / 2;

    function explodeAt(pos) {
      scene.remove(arrow);
      Network.emit('duel-ability-effect', {
        effect: 'explosiveArrow',
        data: { x: pos.x, y: pos.y, z: pos.z },
      });
      Audio.play('explosionRocket');
      FPSEffects.explode(scene, pos, 0xff6600);

      if (opponentMesh) {
        const opPos = new THREE.Vector3();
        opponentMesh.getWorldPosition(opPos);
        const d = pos.distanceTo(opPos);
        const radius = 5;
        if (d < radius) {
          const dmg = damage;
          if (dmg > 0) {
            Network.sendDuelHit(dmg, false, FPS.getMyHP());
            FPSOpponent.flashWhite();
            FPSOpponent.takeDamage(dmg);
            if (onHitCallback) onHitCallback(dmg);
          }
        }
      }
    }

    const HOMING_RADIUS = 8;
    const HOMING_STRENGTH = 0.08;

    const animate = () => {
      const step = speed * 0.016;
      dist += step;

      if (opponentMesh) {
        const opPos = new THREE.Vector3();
        opponentMesh.getWorldPosition(opPos);
        const toOp = opPos.clone().sub(arrow.position);
        const distToOp = toOp.length();
        if (distToOp < HOMING_RADIUS && distToOp > 1.5) {
          toOp.normalize();
          dir.lerp(toOp, HOMING_STRENGTH).normalize();
        }
      }

      arrow.position.addScaledVector(dir, step);
      const p = arrow.position;

      if (p.y <= 0.1 || Math.abs(p.x) > half || Math.abs(p.z) > half) {
        explodeAt(p.clone());
        return;
      }

      if (opponentMesh) {
        const opPos = new THREE.Vector3();
        opponentMesh.getWorldPosition(opPos);
        if (p.distanceTo(opPos) < 1.5) {
          explodeAt(p.clone());
          return;
        }
      }

      const colliders = FPSArena.getColliders();
      for (const c of colliders) {
        if (p.x > c.minX && p.x < c.maxX && p.y > c.minY && p.y < c.maxY &&
            p.z > c.minZ && p.z < c.maxZ) {
          explodeAt(p.clone());
          return;
        }
      }

      if (dist >= 60) {
        explodeAt(p.clone());
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  function tryShoot(camera, opponentMesh, stats, coverMeshes) {
    if (isReloading || FPSGun.isReloading()) return;
    if (pumpPending || boltPending) return;
    if (weapon.type === 'bow') return;

    if (ammo <= 0) {
      if (weapon.type === 'minigun' && minigunSpunUp) {
        minigunSpunUp = false;
        Audio.stop('minigunFire');
        if (minigunFireLoop) { minigunFireLoop.pause(); minigunFireLoop = null; }
        Audio.play('minigunWinddown');
        FPSGun.setMinigunSpin(false);
      }
      const now = performance.now();
      if (now - lastShotTime > 300) {
        Audio.play('emptyClick');
        Audio.play('outOfAmmo');
        showOutOfAmmo();
        lastShotTime = now;
      }
      return;
    }

    const now = performance.now();
    if (now - lastShotTime < weapon.fireRate) return;
    lastShotTime = now;
    ammo--;

    if (weapon.type !== 'minigun') {
      Audio.play(weapon.sounds.fire);
    }
    FPSGun.recoil();
    FPSHUD.updateAmmo(ammo, maxAmmo);

    const bc = BLOOM_CONFIG[weapon.type];
    if (bc) {
      bloom = Math.min(bloom + bc.perShot, bc.max);
      recoilOffsetY += bc.recoilUp;
      recoilOffsetX += (Math.random() - 0.5) * bc.recoilSide * 2;
    }

    if (weapon.type === 'shotgun') {
      fireShotgun(camera, opponentMesh, coverMeshes);
      if (ammo > 0) {
        pumpPending = true;
        setTimeout(() => {
          Audio.play('shotgunPump');
          pumpPending = false;
        }, 400);
      }
    } else if (weapon.type === 'sniper') {
      let spread = FPSGun.getIsADS() ? 0 : weapon.unscopedSpread;
      if (!FPSPlayer.isOnGround()) spread = weapon.jumpingSpread || spread * 2;
      const scopedAssist = FPSGun.getIsADS() ? (weapon.scopedAimAssist || 0) : 0;
      const sniperBloomMult = FPSGun.getIsADS() ? 0 : 1;
      fireBullet(camera, opponentMesh, weapon.damage, spread, coverMeshes, scopedAssist, sniperBloomMult);
      if (ammo > 0) {
        boltPending = true;
        setTimeout(() => {
          Audio.play('sniperBolt');
          boltPending = false;
        }, 600);
      }
    } else if (weapon.type === 'deagle') {
      fireBullet(camera, opponentMesh, weapon.damage, 0, coverMeshes, weapon.aimAssist);
    } else if (weapon.type === 'minigun') {
      fireBullet(camera, opponentMesh, weapon.damage, 0.025, coverMeshes);
    } else if (weapon.type === 'ar') {
      const baseSpread = FPSGun.getIsADS() ? 0.005 : 0.02;
      const adsBloomReduction = FPSGun.getIsADS() ? 0.5 : 1;
      fireBullet(camera, opponentMesh, weapon.damage, baseSpread, coverMeshes, null, adsBloomReduction);
    } else {
      fireBullet(camera, opponentMesh, weapon.damage, 0, coverMeshes);
    }

    Network.sendDuelShoot(FPSPlayer.getState());
  }

  function fireBullet(camera, opponentMesh, damage, spread, coverMeshes, aimAssist, bloomMult) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    const bm = bloomMult !== undefined && bloomMult !== null ? bloomMult : 1;
    const bloomSpread = BLOOM_WEAPONS.includes(weapon.type) ? bloom * bm : 0;
    const totalSpread = spread + bloomSpread;

    dir.x += recoilOffsetX * bm;
    dir.y += recoilOffsetY * bm;

    if (totalSpread > 0) {
      dir.x += (Math.random() - 0.5) * totalSpread;
      dir.y += (Math.random() - 0.5) * totalSpread;
    }
    dir.normalize();

    const origin = camera.position.clone().add(dir.clone().multiplyScalar(0.8));
    spawnBullet(FPSRenderer.getScene(), origin, dir, 0xffcc00);

    if (!opponentMesh) return;

    const raycaster = new THREE.Raycaster();

    if (aimAssist && aimAssist > 0) {
      const opWorldPos = new THREE.Vector3();
      opponentMesh.getWorldPosition(opWorldPos);
      const toOpponent = opWorldPos.clone().sub(camera.position);
      const angleDiff = dir.angleTo(toOpponent.clone().normalize());
      if (angleDiff < 0.15) {
        toOpponent.normalize();
        const aimDir = dir.clone().lerp(toOpponent, aimAssist).normalize();
        raycaster.set(camera.position, aimDir);
      } else {
        raycaster.set(camera.position, dir);
      }
    } else {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    }

    if (totalSpread > 0 && !aimAssist) {
      raycaster.set(camera.position, dir);
    }

    const targets = [opponentMesh, ...coverMeshes];
    const hits = raycaster.intersectObjects(targets, true);

    if (hits.length > 0) {
      const closest = hits[0];
      const hitOpponent = isChildOf(closest.object, opponentMesh);
      if (hitOpponent) {
        const isHeadshot = checkHeadshot(closest, opponentMesh);
        let baseDmg = damage;
        if (weapon.dropoffStart && weapon.dropoffEnd && closest.distance > weapon.dropoffStart) {
          const t = Math.min((closest.distance - weapon.dropoffStart) / (weapon.dropoffEnd - weapon.dropoffStart), 1);
          baseDmg = Math.round(damage * (1 - t * (1 - (weapon.dropoffMin || 0.5))));
        }
        const finalDamage = isHeadshot ? baseDmg * 2 : baseDmg;
        Network.sendDuelHit(finalDamage, isHeadshot, FPS.getMyHP());
        showHitMarker(isHeadshot);
        Audio.play(isHeadshot ? 'headshot' : 'hitConfirm');
        FPSOpponent.flashWhite();
        FPSOpponent.takeDamage(finalDamage);
        if (onHitCallback) onHitCallback(finalDamage);
      } else {
        FPSEffects.spawnImpact(FPSRenderer.getScene(), closest.point);
        FPSArena.damageAt(closest.point, damage);
        Audio.play('wallImpact');
      }
    }
  }

  function fireShotgun(camera, opponentMesh, coverMeshes) {
    const baseDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone().add(baseDir.clone().multiplyScalar(0.8));

    for (let i = 0; i < weapon.pelletCount; i++) {
      const dir = baseDir.clone();
      dir.x += (Math.random() - 0.5) * weapon.spread;
      dir.y += (Math.random() - 0.5) * weapon.spread;
      dir.normalize();

      spawnBullet(FPSRenderer.getScene(), origin.clone(), dir, 0xffcc00);

      if (!opponentMesh) continue;

      const raycaster = new THREE.Raycaster();
      raycaster.set(camera.position, dir);

      const targets = [opponentMesh, ...coverMeshes];
      const hits = raycaster.intersectObjects(targets, true);

      if (hits.length > 0) {
        const closest = hits[0];
        const hitOpponent = isChildOf(closest.object, opponentMesh);
        if (hitOpponent) {
          const dist = closest.distance;
          let dmg = weapon.damagePerPellet;
          if (dist > weapon.falloffStart) {
            const falloff = Math.max(0, 1 - (dist - weapon.falloffStart) / (weapon.falloffEnd - weapon.falloffStart));
            dmg = Math.round(dmg * falloff);
          }
          if (dmg > 0) {
            const isHeadshot = checkHeadshot(closest, opponentMesh);
            const finalDmg = isHeadshot ? dmg * 2 : dmg;
            Network.sendDuelHit(finalDmg, isHeadshot, FPS.getMyHP());
            showHitMarker(isHeadshot);
            Audio.play(isHeadshot ? 'headshot' : 'hitConfirm');
            FPSOpponent.flashWhite();
            FPSOpponent.takeDamage(finalDmg);
            if (onHitCallback) onHitCallback(finalDmg);
          }
        } else {
          FPSEffects.spawnImpact(FPSRenderer.getScene(), closest.point);
          FPSArena.damageAt(closest.point, dmg || weapon.damagePerPellet);
        }
      }
    }
  }

  function checkHeadshot(hit, opponentMesh) {
    const worldPos = new THREE.Vector3();
    opponentMesh.getWorldPosition(worldPos);
    const hitY = hit.point.y;
    const modelTop = worldPos.y + 1.3;
    const headThreshold = worldPos.y + 0.5;
    return hitY > headThreshold && hitY <= modelTop;
  }

  function reload() {
    if (isReloading || ammo >= maxAmmo || weapon.type === 'bow') return;
    isReloading = true;
    FPSHUD.showReloading(true);

    if (weapon.reloadPerShell) {
      reloadShellByShell();
    } else {
      Audio.play(weapon.sounds.reload || 'reload');
      FPSGun.playReloadAnimation(weapon.reloadTime, () => {
        ammo = maxAmmo;
        isReloading = false;
        FPSHUD.updateAmmo(ammo, maxAmmo);
        FPSHUD.showReloading(false);
      });
    }
  }

  function reloadShellByShell() {
    const shellTime = weapon.reloadTime;
    const loadOne = () => {
      if (ammo >= maxAmmo || !isReloading) {
        isReloading = false;
        FPSHUD.showReloading(false);
        return;
      }
      Audio.play(weapon.sounds.reload || 'reload');
      setTimeout(() => {
        if (!isReloading) return;
        ammo++;
        FPSHUD.updateAmmo(ammo, maxAmmo);
        if (ammo < maxAmmo) {
          loadOne();
        } else {
          isReloading = false;
          FPSHUD.showReloading(false);
        }
      }, shellTime);
    };
    loadOne();
  }

  function cancelReload() {
    if (isReloading && weapon.reloadPerShell && ammo > 0) {
      isReloading = false;
      FPSHUD.showReloading(false);
    }
  }

  function tryReload() { reload(); }

  function isChildOf(object, parent) {
    let current = object;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  function spawnBullet(scene, origin, direction, color) {
    const geo = new THREE.SphereGeometry(BULLET_SIZE, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    scene.add(mesh);

    activeBullets.push({ mesh, direction: direction.clone().normalize(), distance: 0, scene });
  }

  function updateBullets(dt) {
    const colliders = FPSArena.getColliders();

    for (let i = activeBullets.length - 1; i >= 0; i--) {
      const b = activeBullets[i];
      const move = BULLET_SPEED * dt;
      b.mesh.position.addScaledVector(b.direction, move);
      b.distance += move;

      const p = b.mesh.position;
      let hitCover = false;
      for (const c of colliders) {
        if (p.x > c.minX && p.x < c.maxX &&
            p.y > c.minY && p.y < c.maxY &&
            p.z > c.minZ && p.z < c.maxZ) {
          hitCover = true;
          break;
        }
      }

      if (hitCover || b.distance >= BULLET_MAX_DIST) {
        b.scene.remove(b.mesh);
        activeBullets.splice(i, 1);
      }
    }
  }

  function updateChargeBar() {
    if (!charging) return;
    const chargeTime = performance.now() - chargeStart;
    const pct = Math.min(chargeTime / weapon.chargeTime, 1);
    FPSHUD.updateChargeBar(pct);
    FPSGun.setBowDraw(pct);
  }

  function showOpponentTracer(scene, data) {
    const origin = new THREE.Vector3(data.x, data.y, data.z);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(data.pitch, data.yaw, 0, 'YXZ')
    );
    const start = origin.add(dir.clone().multiplyScalar(0.8));
    spawnBullet(scene, start, dir, 0xff4444);
  }

  function showOutOfAmmo() {
    let el = document.getElementById('out-of-ammo');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'out-of-ammo';
    el.style.cssText =
      'position:fixed;top:60%;left:50%;transform:translate(-50%,-50%);' +
      'color:#e74c3c;font-size:1rem;font-weight:bold;z-index:16;' +
      'pointer-events:none;text-shadow:0 0 10px rgba(231,76,60,0.5);' +
      'letter-spacing:2px;opacity:1;transition:opacity 0.5s;';
    el.textContent = 'OUT OF AMMO — PRESS R';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 800);
    setTimeout(() => { el.remove(); }, 1300);
  }

  function showHitMarker(isHeadshot) {
    const el = getCrosshair();
    el.classList.add(isHeadshot ? 'headshot' : 'hit');
    setTimeout(() => {
      el.classList.remove('hit');
      el.classList.remove('headshot');
    }, FPSConfig.HIT_MARKER_DURATION);
  }

  function updateBloom(dt) {
    const bc = BLOOM_CONFIG[weapon ? weapon.type : ''];
    const decayRate = bc ? bc.decay : 0.06;

    if (bloom > 0) {
      bloom = Math.max(0, bloom - decayRate * dt);
    }

    recoilOffsetX *= Math.max(0, 1 - 4 * dt);
    recoilOffsetY *= Math.max(0, 1 - 3 * dt);

    if (Math.abs(recoilOffsetX) < 0.0001) recoilOffsetX = 0;
    if (Math.abs(recoilOffsetY) < 0.0001) recoilOffsetY = 0;

    const crosshair = getCrosshair();
    if (!crosshair) return;
    const baseSize = BASE_CROSSHAIR_SIZE[weapon ? weapon.type : ''] || 24;
    const expandPx = bloom * 800;

    let movementExpand = 0;
    if (weapon && weapon.type !== 'bow') {
      const isMoving = FPSInput.isDown('w') || FPSInput.isDown('a') || FPSInput.isDown('s') || FPSInput.isDown('d');
      const isJumping = !FPSPlayer.isOnGround();
      if (isJumping) movementExpand = 15;
      else if (isMoving) movementExpand = 6;
    }

    const newSize = baseSize + expandPx + movementExpand;
    crosshair.style.width = newSize + 'px';
    crosshair.style.height = newSize + 'px';

    const driftX = recoilOffsetX * 3000;
    const driftY = -recoilOffsetY * 3000;
    crosshair.style.transform = `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px))`;

    const reddotDot = document.querySelector('.reddot-dot');
    if (reddotDot) {
      reddotDot.style.transform = `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px))`;
    }
  }

  function getBloom() { return bloom; }

  function reset() {
    lastShotTime = 0;
    isReloading = false;
    charging = false;
    mouseHeld = false;
    pumpPending = false;
    boltPending = false;
    bloom = 0;
    recoilOffsetX = 0;
    recoilOffsetY = 0;
    const crosshair = getCrosshair();
    if (crosshair) {
      crosshair.style.width = '24px';
      crosshair.style.height = '24px';
      crosshair.style.transform = 'translate(-50%, -50%)';
    }
    for (const b of activeBullets) {
      b.scene.remove(b.mesh);
    }
    activeBullets.length = 0;
  }

  function getAmmo() { return ammo; }
  function getMaxAmmo() { return maxAmmo; }
  function isCharging() { return charging; }

  return {
    init, onMouseDown, onMouseUp, onMouseHeld, tryShoot, tryReload, cancelReload,
    showOpponentTracer, updateBullets, updateBloom, updateChargeBar, reset,
    setHitCallback, getAmmo, getMaxAmmo, isCharging, getBloom,
  };
})();
