const FPSGun = (() => {
  let gunGroup = null;
  let camera = null;

  function create(targetCamera) {
    camera = targetCamera;
    gunGroup = new THREE.Group();

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

    gunGroup.position.set(0.25, -0.22, -0.4);
    gunGroup.rotation.set(0, 0, 0);

    camera.add(gunGroup);
  }

  function recoil() {
    if (!gunGroup) return;
    gunGroup.position.z += 0.04;
    gunGroup.rotation.x -= 0.06;

    const startZ = -0.4;
    const startRX = 0;
    const recover = () => {
      gunGroup.position.z += (startZ - gunGroup.position.z) * 0.2;
      gunGroup.rotation.x += (startRX - gunGroup.rotation.x) * 0.2;
      if (Math.abs(gunGroup.position.z - startZ) > 0.001) {
        requestAnimationFrame(recover);
      } else {
        gunGroup.position.z = startZ;
        gunGroup.rotation.x = startRX;
      }
    };
    requestAnimationFrame(recover);
  }

  function destroy() {
    if (gunGroup && camera) {
      camera.remove(gunGroup);
      gunGroup = null;
    }
  }

  return { create, recoil, destroy };
})();
