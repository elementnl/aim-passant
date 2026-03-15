const FPSArena = (() => {
  const colliders = [];

  const COVERS = [
    { pos: [0, 2, 0],       size: [4, 4, 1.5],  type: 'wall' },
    { pos: [0, 1, 6],       size: [2, 2, 2],     type: 'crate' },
    { pos: [0, 1, -6],      size: [2, 2, 2],     type: 'crate' },

    { pos: [-8, 1.5, 8],    size: [3, 3, 1],     type: 'wall' },
    { pos: [-8, 1.5, -8],   size: [1, 3, 3],     type: 'wall' },
    { pos: [8, 1.5, -8],    size: [3, 3, 1],     type: 'wall' },
    { pos: [8, 1.5, 8],     size: [1, 3, 3],     type: 'wall' },

    { pos: [-14, 1, 0],     size: [2, 2, 6],     type: 'wall' },
    { pos: [14, 1, 0],      size: [2, 2, 6],     type: 'wall' },

    { pos: [-5, 0.75, 3],   size: [1.5, 1.5, 1.5], type: 'crate' },
    { pos: [5, 0.75, -3],   size: [1.5, 1.5, 1.5], type: 'crate' },
    { pos: [-5, 0.75, -3],  size: [1.5, 1.5, 1.5], type: 'crate' },
    { pos: [5, 0.75, 3],    size: [1.5, 1.5, 1.5], type: 'crate' },

    { pos: [-12, 1, 14],    size: [4, 2, 1.5],   type: 'crate' },
    { pos: [12, 1, -14],    size: [4, 2, 1.5],   type: 'crate' },
    { pos: [-12, 1, -14],   size: [1.5, 2, 4],   type: 'crate' },
    { pos: [12, 1, 14],     size: [1.5, 2, 4],   type: 'crate' },

    { pos: [0, 1.5, 14],    size: [6, 3, 0.8],   type: 'wall' },
    { pos: [0, 1.5, -14],   size: [6, 3, 0.8],   type: 'wall' },

    { pos: [-16, 0.75, 6],  size: [1.5, 1.5, 1.5], type: 'crate' },
    { pos: [16, 0.75, -6],  size: [1.5, 1.5, 1.5], type: 'crate' },

    { pos: [-3, 2.5, 0],    size: [0.8, 5, 0.8],   type: 'pillar' },
    { pos: [3, 2.5, 0],     size: [0.8, 5, 0.8],   type: 'pillar' },
  ];

  function createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
  }

  function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = '#606060';
    for (let y = 0; y < 64; y += 16) {
      const offset = (y % 32 === 0) ? 0 : 16;
      for (let x = offset; x < 64; x += 32) {
        ctx.fillRect(x + 1, y + 1, 30, 14);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function build(scene) {
    const { ARENA_SIZE, WALL_HEIGHT } = FPSConfig;
    colliders.length = 0;

    const floorTex = createFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    scene.add(ceiling);

    const wallTex = createWallTexture();
    const half = ARENA_SIZE / 2;

    [
      { pos: [0, WALL_HEIGHT / 2, -half], size: [ARENA_SIZE, WALL_HEIGHT, 0.5], texRepeat: [8, 2] },
      { pos: [0, WALL_HEIGHT / 2, half],  size: [ARENA_SIZE, WALL_HEIGHT, 0.5], texRepeat: [8, 2] },
      { pos: [-half, WALL_HEIGHT / 2, 0], size: [0.5, WALL_HEIGHT, ARENA_SIZE], texRepeat: [8, 2] },
      { pos: [half, WALL_HEIGHT / 2, 0],  size: [0.5, WALL_HEIGHT, ARENA_SIZE], texRepeat: [8, 2] },
    ].forEach(({ pos, size, texRepeat }) => {
      const tex = wallTex.clone();
      tex.repeat.set(...texRepeat);
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    const coverMeshes = [];
    const colors = {
      wall: 0x707070,
      crate: 0x8B7355,
      pillar: 0x606060,
    };

    COVERS.forEach(({ pos, size, type }) => {
      const color = colors[type] || 0x888888;
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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
