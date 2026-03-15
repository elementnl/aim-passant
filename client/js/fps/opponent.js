const FPSOpponent = (() => {
  let mesh = null;
  let originalMaterials = [];
  const currentPos = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  const rot = { yaw: 0 };

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

    scene.add(mesh);
  }

  function flashWhite() {
    if (!mesh) return;
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    mesh.traverse(child => {
      if (child.isMesh) child.material = whiteMat;
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
  }

  function getMesh() { return mesh; }

  function destroy(scene) {
    if (mesh) {
      scene.remove(mesh);
      mesh = null;
      originalMaterials = [];
    }
  }

  return { create, flashWhite, updateFromNetwork, interpolate, getMesh, destroy };
})();
