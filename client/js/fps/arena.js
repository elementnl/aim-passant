const FPSArena = (() => {
  const colliders = [];

  const COVERS = [
    { pos: [3, 1, 3],     size: [2, 2, 2] },
    { pos: [-3, 1, -3],   size: [2, 2, 2] },
    { pos: [5, 0.75, -2], size: [1.5, 1.5, 3] },
    { pos: [-5, 0.75, 2], size: [1.5, 1.5, 3] },
    { pos: [0, 1.5, 0],   size: [3, 3, 1] },
    { pos: [-6, 1, 5],    size: [2, 2, 1.5] },
    { pos: [6, 1, -5],    size: [2, 2, 1.5] },
  ];

  function build(scene) {
    const { ARENA_SIZE, WALL_HEIGHT } = FPSConfig;
    colliders.length = 0;

    const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const half = ARENA_SIZE / 2;

    [
      { pos: [0, WALL_HEIGHT / 2, -half], size: [ARENA_SIZE, WALL_HEIGHT, 0.5] },
      { pos: [0, WALL_HEIGHT / 2, half],  size: [ARENA_SIZE, WALL_HEIGHT, 0.5] },
      { pos: [-half, WALL_HEIGHT / 2, 0], size: [0.5, WALL_HEIGHT, ARENA_SIZE] },
      { pos: [half, WALL_HEIGHT / 2, 0],  size: [0.5, WALL_HEIGHT, ARENA_SIZE] },
    ].forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
      mesh.position.set(...pos);
      scene.add(mesh);
    });

    const coverMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const coverMeshes = [];

    COVERS.forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), coverMat);
      mesh.position.set(...pos);
      scene.add(mesh);
      coverMeshes.push(mesh);

      colliders.push({
        minX: pos[0] - size[0] / 2,
        maxX: pos[0] + size[0] / 2,
        minY: pos[1] - size[1] / 2,
        maxY: pos[1] + size[1] / 2,
        minZ: pos[2] - size[2] / 2,
        maxZ: pos[2] + size[2] / 2,
      });
    });

    return coverMeshes;
  }

  function getColliders() {
    return colliders;
  }

  return { build, getColliders };
})();
