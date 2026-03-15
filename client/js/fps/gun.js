const FPSGun = (() => {
  let gunGroup = null;
  let camera = null;
  let muzzleFlash = null;
  let reloading = false;

  const REST_POS = { x: 0.25, y: -0.22, z: -0.4 };
  const REST_ROT = { x: 0, y: 0, z: 0 };
  const RELOAD_DURATION = 2200;

  function create(targetCamera) {
    camera = targetCamera;
    gunGroup = new THREE.Group();
    reloading = false;

    const metalDark = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const metalLight = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.3), metalDark);
    body.position.set(0, -0.02, -0.1);
    gunGroup.add(body);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), metalLight);
    barrel.position.set(0, 0.02, -0.3);
    gunGroup.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), metalDark);
    grip.position.set(0, -0.1, -0.05);
    grip.rotation.x = 0.2;
    gunGroup.add(grip);

    const trigger = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.04, 0.02),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    trigger.position.set(0, -0.06, -0.08);
    gunGroup.add(trigger);

    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0 });
    muzzleFlash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), flashMat);
    muzzleFlash.position.set(0, 0.02, -0.46);
    gunGroup.add(muzzleFlash);

    gunGroup.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
    gunGroup.rotation.set(REST_ROT.x, REST_ROT.y, REST_ROT.z);

    camera.add(gunGroup);
  }

  function recoil() {
    if (!gunGroup || reloading) return;
    gunGroup.position.z += 0.04;
    gunGroup.rotation.x -= 0.06;

    if (muzzleFlash) {
      muzzleFlash.material.opacity = 1;
      setTimeout(() => {
        if (muzzleFlash) muzzleFlash.material.opacity = 0;
      }, 50);
    }

    const recover = () => {
      if (!gunGroup || reloading) return;
      gunGroup.position.z += (REST_POS.z - gunGroup.position.z) * 0.2;
      gunGroup.rotation.x += (REST_ROT.x - gunGroup.rotation.x) * 0.2;
      if (Math.abs(gunGroup.position.z - REST_POS.z) > 0.001) {
        requestAnimationFrame(recover);
      } else {
        gunGroup.position.z = REST_POS.z;
        gunGroup.rotation.x = REST_ROT.x;
      }
    };
    requestAnimationFrame(recover);
  }

  function playReloadAnimation(callback) {
    if (!gunGroup || reloading) return;
    reloading = true;

    const startTime = performance.now();
    const animate = (now) => {
      if (!gunGroup) { reloading = false; return; }

      const t = Math.min((now - startTime) / RELOAD_DURATION, 1);

      if (t < 0.3) {
        const p = t / 0.3;
        gunGroup.position.y = REST_POS.y - p * 0.3;
        gunGroup.rotation.x = REST_ROT.x + p * 0.5;
      } else if (t < 0.7) {
        gunGroup.position.y = REST_POS.y - 0.3;
        gunGroup.rotation.x = REST_ROT.x + 0.5;
      } else {
        const p = (t - 0.7) / 0.3;
        gunGroup.position.y = REST_POS.y - 0.3 * (1 - p);
        gunGroup.rotation.x = REST_ROT.x + 0.5 * (1 - p);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        gunGroup.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
        gunGroup.rotation.set(REST_ROT.x, REST_ROT.y, REST_ROT.z);
        reloading = false;
        if (callback) callback();
      }
    };
    requestAnimationFrame(animate);
  }

  function isReloading() {
    return reloading;
  }

  function destroy() {
    if (gunGroup && camera) {
      camera.remove(gunGroup);
      gunGroup = null;
      muzzleFlash = null;
      reloading = false;
    }
  }

  return { create, recoil, playReloadAnimation, isReloading, destroy };
})();
