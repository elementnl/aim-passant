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
    lastShotTime = 0;
  }

  function onMouseDown(camera, opponentMesh, stats, coverMeshes) {
    mouseHeld = true;
    if (weapon.type === 'bow') {
      startCharge();
      return;
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
      const spread = FPSGun.getIsADS() ? 0.005 : 0.02;
      fireBullet(camera, opponentMesh, weapon.damage, spread, coverMeshes);
    } else {
      fireBullet(camera, opponentMesh, weapon.damage, 0, coverMeshes);
    }

    Network.sendDuelShoot(FPSPlayer.getState());
  }

  function fireBullet(camera, opponentMesh, damage, spread, coverMeshes, aimAssist) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    if (spread > 0) {
      dir.x += (Math.random() - 0.5) * spread;
      dir.y += (Math.random() - 0.5) * spread;
      dir.normalize();
    }

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

    if (spread > 0 && !aimAssist) {
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
        Network.sendDuelHit(finalDamage, isHeadshot);
        showHitMarker(isHeadshot);
        Audio.play(isHeadshot ? 'headshot' : 'hitConfirm');
        FPSOpponent.flashWhite();
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
            Network.sendDuelHit(finalDmg, isHeadshot);
            showHitMarker(isHeadshot);
            Audio.play(isHeadshot ? 'headshot' : 'hitConfirm');
            FPSOpponent.flashWhite();
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

  function reset() {
    lastShotTime = 0;
    isReloading = false;
    charging = false;
    mouseHeld = false;
    pumpPending = false;
    boltPending = false;
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
    showOpponentTracer, updateBullets, updateChargeBar, reset, getAmmo, getMaxAmmo, isCharging,
  };
})();
