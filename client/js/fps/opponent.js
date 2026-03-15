const FPSOpponent = (() => {
  let mesh = null;
  const currentPos = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  const rot = { yaw: 0 };

  function create(scene, isAttacker, pieceType) {
    if (mesh) scene.remove(mesh);

    const color = isAttacker ? 0x4488ff : 0xff4444;
    mesh = FPSModels.createPieceModel(pieceType || 'p', color);
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    scene.add(mesh);
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
    }
  }

  return { create, updateFromNetwork, interpolate, getMesh, destroy };
})();
