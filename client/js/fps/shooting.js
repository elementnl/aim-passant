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

  let bloom = 0;
  let recoilOffsetX = 0;
  let recoilOffsetY = 0;
  const BLOOM_WEAPONS = ['pistol', 'ar', 'deagle', 'shotgun'];
  const BLOOM_CONFIG = {
    pistol:  { perShot: 0.008, max: 0.04,  decay: 0.06,  recoilUp: 0.003, recoilSide: 0.001 },
    ar:      { perShot: 0.006, max: 0.07,  decay: 0.035, recoilUp: 0.004, recoilSide: 0.002 },
    deagle:  { perShot: 0.015, max: 0.05,  decay: 0.06,  recoilUp: 0.005, recoilSide: 0.002 },
    shotgun: { perShot: 0.01,  max: 0.03,  decay: 0.05,  recoilUp: 0.004, recoilSide: 0.001 },
  };
  const BASE_CROSSHAIR_SIZE = {
    pistol: 24, bow: 22, shotgun: 50, sniper: 80, ar: 24, deagle: 26,
  };

  const BULLET_SPEED = 80;
  const BULLET_MAX_DIST = 60;
  const BULLET_SIZE = 0.06;

  function init(stats) {
    weapon = stats.weapon;
    maxAmmo = weapon.magSize;
    ammo = maxAmmo;
    isReloading = false;
    charging = false;
    mouseHeld = false;
    pumpPending = false;
    boltPending = false;
    bloom = 0;
    recoilOffsetX = 0;
    recoilOffsetY = 0;
    lastShotTime = 0;
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      const base = BASE_CROSSHAIR_SIZE[weapon.type] || 24;
      crosshair.style.width = base + 'px';
      crosshair.style.height = base + 'px';
      crosshair.style.transform = 'translate(-50%, -50%)';
    }
  }

  function onMouseDown(camera, opponentMesh, stats, coverMeshes) {
    mouseHeld = true;
    if (weapon.type === 'bow') {
      startCharge();
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
  }

  function onMouseHeld(camera, opponentMesh, stats, coverMeshes) {
    if (!mouseHeld || !weapon.auto) return;
    tryShoot(camera, opponentMesh, stats, coverMeshes);
  }

  function startCharge() {
    if (isReloading || FPSGun.isReloading()) return;
    charging = true;
    chargeStart = performance.now();
    Audio.play('bowDraw');
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
    const damage = weapon.damageMin + (weapon.damageMax - weapon.damageMin) * chargePercent;

    FPSGun.bowRelease();
    Audio.play('bowRelease');
    fireBullet(camera, opponentMesh, Math.round(damage), 0, coverMeshes);
    Network.sendDuelShoot(FPSPlayer.getState());
  }

  function tryShoot(camera, opponentMesh, stats, coverMeshes) {
    if (isReloading || FPSGun.isReloading()) return;
    if (pumpPending || boltPending) return;
    if (weapon.type === 'bow') return;

    if (ammo <= 0) {
      const now = performance.now();
      if (now - lastShotTime > 300) {
        Audio.play('emptyClick');
        lastShotTime = now;
      }
      return;
    }

    const now = performance.now();
    if (now - lastShotTime < weapon.fireRate) return;
    lastShotTime = now;
    ammo--;

    const fireSound = weapon.sounds.fire;
    Audio.play(fireSound);
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
      fireBullet(camera, opponentMesh, weapon.damage, spread, coverMeshes);
      if (ammo > 0) {
        boltPending = true;
        setTimeout(() => {
          Audio.play('sniperBolt');
          boltPending = false;
        }, 600);
      }
    } else if (weapon.type === 'deagle') {
      fireBullet(camera, opponentMesh, weapon.damage, 0, coverMeshes, weapon.aimAssist);
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
      const toOpponent = new THREE.Vector3();
      opponentMesh.getWorldPosition(toOpponent);
      toOpponent.sub(camera.position).normalize();
      const aimDir = dir.clone().lerp(toOpponent, aimAssist).normalize();
      raycaster.set(camera.position, aimDir);
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
        const finalDamage = isHeadshot ? damage * 2 : damage;
        Network.sendDuelHit(finalDamage, isHeadshot, FPS.getMyHP());
        showHitMarker(isHeadshot);
        Audio.play(isHeadshot ? 'headshot' : 'hitConfirm');
        FPSOpponent.flashWhite();
        FPSOpponent.takeDamage(finalDamage);
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

  function showHitMarker(isHeadshot) {
    const el = document.getElementById('crosshair');
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

    const crosshair = document.getElementById('crosshair');
    const baseSize = BASE_CROSSHAIR_SIZE[weapon ? weapon.type : ''] || 24;
    const expandPx = bloom * 800;
    const newSize = baseSize + expandPx;
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
    const crosshair = document.getElementById('crosshair');
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
    getAmmo, getMaxAmmo, isCharging, getBloom,
  };
})();
