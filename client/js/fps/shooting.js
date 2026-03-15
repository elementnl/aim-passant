const FPSShooting = (() => {
  let lastShotTime = 0;
  const activeBullets = [];

  const BULLET_SPEED = 80;
  const BULLET_MAX_DIST = 60;
  const BULLET_SIZE = 0.06;

  const MAX_AMMO = 12;
  let ammo = MAX_AMMO;
  let isReloading = false;

  function tryShoot(camera, opponentMesh, stats, coverMeshes) {
    if (isReloading || FPSGun.isReloading()) return;
    if (ammo <= 0) {
      Audio.play('emptyClick');
      return;
    }

    const now = performance.now();
    if (now - lastShotTime < stats.fireRate) return;
    lastShotTime = now;
    ammo--;

    FPSGun.recoil();
    Audio.play('shoot');
    FPSHUD.updateAmmo(ammo, MAX_AMMO);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone().add(dir.clone().multiplyScalar(0.8));
    spawnBullet(FPSRenderer.getScene(), origin, dir, 0xffcc00);

    if (opponentMesh) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      const targets = [opponentMesh, ...coverMeshes];
      const hits = raycaster.intersectObjects(targets, true);

      if (hits.length > 0) {
        const closest = hits[0];
        const hitOpponent = isChildOf(closest.object, opponentMesh);
        if (hitOpponent) {
          Network.sendDuelHit(stats.damage);
          showHitMarker();
          Audio.play('hitConfirm');
        }
      }
    }

    Network.sendDuelShoot(FPSPlayer.getState());
  }

  function reload() {
    if (isReloading || ammo >= MAX_AMMO) return;
    isReloading = true;
    FPSHUD.showReloading(true);
    Audio.play('reload');

    FPSGun.playReloadAnimation(() => {
      ammo = MAX_AMMO;
      isReloading = false;
      FPSHUD.updateAmmo(ammo, MAX_AMMO);
      FPSHUD.showReloading(false);
    });
  }

  function tryReload() {
    reload();
  }

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

    activeBullets.push({
      mesh,
      direction: direction.clone().normalize(),
      distance: 0,
      scene,
    });
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

  function showOpponentTracer(scene, data) {
    const origin = new THREE.Vector3(data.x, data.y, data.z);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(data.pitch, data.yaw, 0, 'YXZ')
    );
    const start = origin.add(dir.clone().multiplyScalar(0.8));
    spawnBullet(scene, start, dir, 0xff4444);
  }

  function showHitMarker() {
    const el = document.getElementById('crosshair');
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), FPSConfig.HIT_MARKER_DURATION);
  }

  function reset() {
    lastShotTime = 0;
    ammo = MAX_AMMO;
    isReloading = false;
    for (const b of activeBullets) {
      b.scene.remove(b.mesh);
    }
    activeBullets.length = 0;
  }

  function getAmmo() { return ammo; }
  function getMaxAmmo() { return MAX_AMMO; }

  return { tryShoot, tryReload, showOpponentTracer, updateBullets, reset, getAmmo, getMaxAmmo };
})();
