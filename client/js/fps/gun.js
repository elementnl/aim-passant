const FPSGun = (() => {
  let gunGroup = null;
  let camera = null;
  let muzzleFlash = null;
  let reloading = false;
  let weaponType = 'pistol';
  let bowString = null;
  let bowArrow = null;
  let bowDrawAmount = 0;
  let minigunBarrels = null;
  let minigunSpinSpeed = 0;
  let minigunTargetSpin = 0;

  const REST_POS = { x: 0.25, y: -0.22, z: -0.4 };
  const ADS_POS = { x: 0, y: -0.15, z: -0.35 };
  let isADS = false;
  let currentPos = { ...REST_POS };

  function create(targetCamera, type) {
    camera = targetCamera;
    weaponType = type || 'pistol';
    gunGroup = new THREE.Group();
    reloading = false;
    isADS = false;
    currentPos = { ...REST_POS };

    const builders = {
      pistol: buildPistol,
      bow: buildBow,
      shotgun: buildShotgun,
      sniper: buildSniper,
      ar: buildAR,
      deagle: buildDeagle,
      minigun: buildMinigun,
    };

    (builders[weaponType] || buildPistol)(gunGroup);
    gunGroup.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
    camera.add(gunGroup);
  }

  function addArm(group, gripX, gripY, gripZ) {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.1), skinMat);
    hand.position.set(gripX, gripY, gripZ);
    group.add(hand);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), sleeveMat);
    forearm.position.set(gripX + 0.08, gripY - 0.04, gripZ + 0.15);
    forearm.rotation.y = 0.3;
    forearm.rotation.x = 0.15;
    group.add(forearm);
  }

  function buildPistol(group) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const light = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.3), dark);
    body.position.set(0, -0.02, -0.1);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), light);
    barrel.position.set(0, 0.02, -0.3);
    group.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), dark);
    grip.position.set(0, -0.1, -0.05);
    grip.rotation.x = 0.2;
    group.add(grip);

    addMuzzleFlash(group, 0, 0.02, -0.46);
    addArm(group, 0, -0.1, -0.05);
  }

  function buildBow(group) {
    const wood = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const stringMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const arrowMat = new THREE.MeshLambertMaterial({ color: 0x666666 });

    const limb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), wood);
    limb.position.set(0, 0, -0.3);
    group.add(limb);

    const topCurve = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), wood);
    topCurve.position.set(0, 0.35, -0.24);
    group.add(topCurve);

    const botCurve = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), wood);
    botCurve.position.set(0, -0.35, -0.24);
    group.add(botCurve);

    bowString = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.7, 0.01), stringMat);
    bowString.position.set(0, 0, -0.2);
    group.add(bowString);

    bowArrow = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.4), arrowMat);
    bowArrow.position.set(0, 0, -0.2);
    bowArrow.visible = false;
    group.add(bowArrow);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), wood);
    grip.position.set(0, 0, -0.3);
    group.add(grip);

    addArm(group, 0, -0.05, -0.25);
  }

  function buildShotgun(group) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const wood = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x444444 });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.35);
    group.add(barrel);

    const pumpGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.12), metal);
    pumpGrip.position.set(0, -0.02, -0.25);
    group.add(pumpGrip);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.2), dark);
    body.position.set(0, 0, -0.1);
    group.add(body);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.18), wood);
    stock.position.set(0, -0.01, 0.08);
    group.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), wood);
    grip.position.set(0, -0.08, 0);
    grip.rotation.x = 0.25;
    group.add(grip);

    addMuzzleFlash(group, 0, 0.02, -0.63);
    addArm(group, 0, -0.08, 0);
  }

  function buildSniper(group) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const metal = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const wood = new THREE.MeshLambertMaterial({ color: 0x5a4a30 });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.4);
    group.add(barrel);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.3), metal);
    body.position.set(0, 0, -0.08);
    group.add(body);

    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15, 6), dark);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.06, -0.1);
    group.add(scope);

    const scopeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.02, 6), metal);
    scopeFront.rotation.x = Math.PI / 2;
    scopeFront.position.set(0, 0.06, -0.18);
    group.add(scopeFront);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.22), wood);
    stock.position.set(0, -0.01, 0.12);
    group.add(stock);

    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), metal);
    bolt.position.set(0.04, 0.02, -0.02);
    group.add(bolt);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), wood);
    grip.position.set(0, -0.08, 0);
    grip.rotation.x = 0.2;
    group.add(grip);

    addMuzzleFlash(group, 0, 0.02, -0.76);
    addArm(group, 0, -0.08, 0);
  }

  function buildAR(group) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const metal = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.35);
    group.add(barrel);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), metal);
    handguard.position.set(0, 0.01, -0.22);
    group.add(handguard);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.22), dark);
    body.position.set(0, 0, -0.04);
    group.add(body);

    const redDot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.05), metal);
    redDot.position.set(0, 0.06, -0.08);
    group.add(redDot);

    const redLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.03, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
    );
    redLens.position.set(0, 0.06, -0.105);
    group.add(redLens);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), dark);
    mag.position.set(0, -0.1, -0.05);
    mag.rotation.x = 0.1;
    group.add(mag);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.15), dark);
    stock.position.set(0, 0, 0.12);
    group.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), dark);
    grip.position.set(0, -0.08, 0.02);
    grip.rotation.x = 0.2;
    group.add(grip);

    addMuzzleFlash(group, 0, 0.02, -0.56);
    addArm(group, 0, -0.08, 0.02);
  }

  function buildDeagle(group) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const chrome = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.32), dark);
    body.position.set(0, -0.02, -0.12);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.2), chrome);
    barrel.position.set(0, 0.03, -0.32);
    group.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.07), dark);
    grip.position.set(0, -0.12, -0.04);
    grip.rotation.x = 0.25;
    group.add(grip);

    const trigger = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.04, 0.02),
      new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    trigger.position.set(0, -0.07, -0.1);
    group.add(trigger);

    addMuzzleFlash(group, 0, 0.03, -0.46);
    addArm(group, 0, -0.12, -0.04);
  }

  function buildMinigun(group) {
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const metal = new THREE.MeshLambertMaterial({ color: 0x444444 });

    minigunBarrels = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 4), metal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(Math.cos(angle) * 0.04, Math.sin(angle) * 0.04, -0.35);
      minigunBarrels.add(barrel);
    }
    group.add(minigunBarrels);
    minigunSpinSpeed = 0;
    minigunTargetSpin = 0;

    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6), dark);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(0, 0, -0.1);
    group.add(housing);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.2), dark);
    body.position.set(0, -0.01, 0.02);
    group.add(body);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.07), metal);
    mag.position.set(0, -0.12, -0.02);
    group.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), dark);
    grip.position.set(0, -0.09, 0.08);
    grip.rotation.x = 0.2;
    group.add(grip);

    addMuzzleFlash(group, 0, 0, -0.6);
    addArm(group, 0, -0.09, 0.08);
  }

  function addMuzzleFlash(group, x, y, z) {
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0 });
    muzzleFlash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), flashMat);
    muzzleFlash.position.set(x, y, z);
    group.add(muzzleFlash);
  }

  function recoil() {
    if (!gunGroup || reloading) return;

    const recoilAmount = weaponType === 'deagle' ? 0.06 : weaponType === 'sniper' ? 0.08 :
                         weaponType === 'shotgun' ? 0.07 : 0.04;
    const rotAmount = weaponType === 'deagle' ? 0.08 : weaponType === 'sniper' ? 0.1 :
                      weaponType === 'shotgun' ? 0.09 : 0.06;

    gunGroup.position.z += recoilAmount;
    gunGroup.rotation.x -= rotAmount;

    if (muzzleFlash) {
      muzzleFlash.material.opacity = 1;
      setTimeout(() => {
        if (muzzleFlash) muzzleFlash.material.opacity = 0;
      }, 50);
    }

    const targetZ = isADS ? ADS_POS.z : REST_POS.z;
    const targetRX = 0;
    const recover = () => {
      if (!gunGroup || reloading) return;
      gunGroup.position.z += (targetZ - gunGroup.position.z) * 0.2;
      gunGroup.rotation.x += (targetRX - gunGroup.rotation.x) * 0.2;
      if (Math.abs(gunGroup.position.z - targetZ) > 0.001) {
        requestAnimationFrame(recover);
      } else {
        gunGroup.position.z = targetZ;
        gunGroup.rotation.x = targetRX;
      }
    };
    requestAnimationFrame(recover);
  }

  function setADS(ads) {
    if (reloading) return;
    isADS = ads;
  }

  function updateADS() {
    if (!gunGroup || reloading) return;
    const target = isADS ? ADS_POS : REST_POS;
    gunGroup.position.x += (target.x - gunGroup.position.x) * 0.15;
    gunGroup.position.y += (target.y - gunGroup.position.y) * 0.15;

    if (minigunBarrels) {
      minigunSpinSpeed += (minigunTargetSpin - minigunSpinSpeed) * 0.1;
      minigunBarrels.rotation.z += minigunSpinSpeed;
    }
  }

  function setMinigunSpin(spinning) {
    minigunTargetSpin = spinning ? 0.4 : 0;
  }

  function setMinigunSpinup(active) {
    minigunTargetSpin = active ? 0.15 : 0;
  }

  function getIsADS() { return isADS; }

  function playReloadAnimation(duration, callback) {
    if (!gunGroup || reloading) return;
    reloading = true;
    isADS = false;

    const startTime = performance.now();
    const animate = (now) => {
      if (!gunGroup) { reloading = false; return; }

      const t = Math.min((now - startTime) / duration, 1);

      if (t < 0.3) {
        const p = t / 0.3;
        gunGroup.position.y = REST_POS.y - p * 0.3;
        gunGroup.rotation.x = p * 0.5;
      } else if (t < 0.7) {
        gunGroup.position.y = REST_POS.y - 0.3;
        gunGroup.rotation.x = 0.5;
      } else {
        const p = (t - 0.7) / 0.3;
        gunGroup.position.y = REST_POS.y - 0.3 * (1 - p);
        gunGroup.rotation.x = 0.5 * (1 - p);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        gunGroup.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
        gunGroup.rotation.set(0, 0, 0);
        reloading = false;
        if (callback) callback();
      }
    };
    requestAnimationFrame(animate);
  }

  function setBowDraw(pct) {
    bowDrawAmount = pct;
    if (!bowString || !bowArrow) return;
    const pullBack = pct * 0.15;
    bowString.position.z = -0.2 + pullBack;
    bowArrow.visible = pct > 0;
    bowArrow.position.z = -0.2 + pullBack;
  }

  function bowRelease() {
    if (!bowString || !bowArrow) return;
    bowArrow.visible = false;
    bowString.position.z = -0.2;
    bowDrawAmount = 0;

    if (gunGroup) {
      gunGroup.position.z -= 0.03;
      const recover = () => {
        if (!gunGroup) return;
        gunGroup.position.z += (REST_POS.z - gunGroup.position.z) * 0.15;
        if (Math.abs(gunGroup.position.z - REST_POS.z) > 0.001) {
          requestAnimationFrame(recover);
        } else {
          gunGroup.position.z = REST_POS.z;
        }
      };
      requestAnimationFrame(recover);
    }
  }

  function isReloading() { return reloading; }

  function destroy() {
    if (gunGroup && camera) {
      camera.remove(gunGroup);
      gunGroup = null;
      muzzleFlash = null;
      bowString = null;
      bowArrow = null;
      bowDrawAmount = 0;
      minigunBarrels = null;
      minigunSpinSpeed = 0;
      minigunTargetSpin = 0;
      reloading = false;
      isADS = false;
    }
  }

  return { create, recoil, setADS, updateADS, getIsADS, setBowDraw, bowRelease, setMinigunSpin, setMinigunSpinup, playReloadAnimation, isReloading, destroy };
})();
