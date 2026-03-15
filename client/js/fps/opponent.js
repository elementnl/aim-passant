const FPSOpponent = (() => {
  let mesh = null;
  let originalMaterials = [];
  let healthBarGroup = null;
  let healthFillMesh = null;
  let healthMaxHP = 100;
  let healthCurrentHP = 100;
  const currentPos = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  const rot = { yaw: 0 };

  const BAR_WIDTH = 0.8;
  const BAR_HEIGHT = 0.06;

  function create(scene, isAttacker, pieceType) {
    if (mesh) scene.remove(mesh);

    const color = isAttacker ? 0x4488ff : 0xff4444;
    mesh = FPSModels.createPieceModel(pieceType || 'p', color);
    originalMaterials = [];
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        originalMaterials.push({ mesh: child, material: child.material });
      }
    });

    createHealthBar();
    scene.add(mesh);
  }

  function createHealthBar() {
    healthBarGroup = new THREE.Group();

    const bgGeo = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    healthBarGroup.add(bg);

    const fillGeo = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    healthFillMesh = new THREE.Mesh(fillGeo, fillMat);
    healthBarGroup.add(healthFillMesh);

    healthBarGroup.position.y = 1.9;
    mesh.add(healthBarGroup);
  }

  function setHP(current, max) {
    healthCurrentHP = current;
    healthMaxHP = max;
    updateHealthBar();
  }

  function takeDamage(damage) {
    healthCurrentHP = Math.max(0, healthCurrentHP - damage);
    updateHealthBar();
  }

  function updateHealthBar() {
    if (!healthFillMesh) return;
    const pct = Math.max(0, healthCurrentHP / healthMaxHP);
    healthFillMesh.scale.x = pct;
    healthFillMesh.position.x = -(BAR_WIDTH * (1 - pct)) / 2;

    const mat = healthFillMesh.material;
    if (pct > 0.6) mat.color.setHex(0x2ecc71);
    else if (pct > 0.3) mat.color.setHex(0xe9a545);
    else mat.color.setHex(0xe74c3c);
  }

  function flashWhite() {
    if (!mesh) return;
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    mesh.traverse(child => {
      if (child.isMesh && child !== healthFillMesh && child.parent !== healthBarGroup) {
        child.material = whiteMat;
      }
    });
    setTimeout(() => {
      if (!mesh) return;
      originalMaterials.forEach(({ mesh: m, material }) => {
        m.material = material;
      });
    }, 80);
  }

  function updateFromNetwork(data) {
    targetPos.set(data.x, data.y, data.z);
    rot.yaw = data.yaw;
  }

  function interpolate() {
    if (!mesh) return;
    currentPos.lerp(targetPos, 0.2);
    mesh.position.set(currentPos.x, currentPos.y - 0.8, currentPos.z);
    mesh.rotation.y = rot.yaw;

    if (healthBarGroup) {
      healthBarGroup.rotation.y = -mesh.rotation.y;
    }
  }

  function getMesh() { return mesh; }

  function destroy(scene) {
    if (mesh) {
      scene.remove(mesh);
      mesh = null;
      originalMaterials = [];
      healthBarGroup = null;
      healthFillMesh = null;
    }
  }

  return { create, setHP, takeDamage, flashWhite, updateFromNetwork, interpolate, getMesh, destroy };
})();
