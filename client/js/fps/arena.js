const FPSArena = (() => {
  const colliders = [];
  const destructibles = [];
  let currentLayout = 0;

  const LAYOUTS = [
    {
      name: 'Warehouse',
      arenaSize: 40,
      wallHeight: 10,
      covers: [
        { pos: [0, 2, 0],       size: [4, 4, 1.5],    type: 'wall' },
        { pos: [0, 1, 6],       size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [0, 1, -6],      size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [-8, 1.5, 8],    size: [3, 3, 1],       type: 'wall' },
        { pos: [-8, 1.5, -8],   size: [1, 3, 3],       type: 'wall' },
        { pos: [8, 1.5, -8],    size: [3, 3, 1],       type: 'wall' },
        { pos: [8, 1.5, 8],     size: [1, 3, 3],       type: 'wall' },
        { pos: [-14, 1, 0],     size: [2, 2, 6],       type: 'wall' },
        { pos: [14, 1, 0],      size: [2, 2, 6],       type: 'wall' },
        { pos: [-5, 0.75, 3],   size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [5, 0.75, -3],   size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [-5, 0.75, -3],  size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [5, 0.75, 3],    size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [-12, 1, 14],    size: [4, 2, 1.5],     type: 'crate' },
        { pos: [12, 1, -14],    size: [4, 2, 1.5],     type: 'crate' },
        { pos: [0, 1.5, 14],    size: [6, 3, 0.8],     type: 'wall' },
        { pos: [0, 1.5, -14],   size: [6, 3, 0.8],     type: 'wall' },
        { pos: [-3, 3, 0],      size: [0.8, 6, 0.8],   type: 'pillar' },
        { pos: [3, 3, 0],       size: [0.8, 6, 0.8],   type: 'pillar' },
      ],
    },
    {
      name: 'Bunker',
      arenaSize: 26,
      wallHeight: 3.5,
      covers: [
        { pos: [-5, 1.25, 0],   size: [0.5, 2.5, 8],   type: 'wall' },
        { pos: [5, 1.25, 0],    size: [0.5, 2.5, 8],    type: 'wall' },
        { pos: [0, 1.25, -5],   size: [4, 2.5, 0.5],    type: 'wall' },
        { pos: [0, 1.25, 5],    size: [4, 2.5, 0.5],    type: 'wall' },
        { pos: [-9, 0.75, 5],   size: [1.5, 1.5, 1.5],  type: 'crate', destructible: true },
        { pos: [9, 0.75, -5],   size: [1.5, 1.5, 1.5],  type: 'crate', destructible: true },
        { pos: [-9, 0.75, -5],  size: [1.5, 1.5, 1.5],  type: 'crate', destructible: true },
        { pos: [9, 0.75, 5],    size: [1.5, 1.5, 1.5],  type: 'crate', destructible: true },
        { pos: [0, 0.75, 0],    size: [1.5, 1.5, 1.5],  type: 'crate', destructible: true },
        { pos: [-3, 0.5, 9],    size: [3, 1, 0.5],       type: 'wall' },
        { pos: [3, 0.5, -9],    size: [3, 1, 0.5],       type: 'wall' },
        { pos: [-9, 1.25, 0],   size: [1.5, 2.5, 0.5],  type: 'wall' },
        { pos: [9, 1.25, 0],    size: [1.5, 2.5, 0.5],  type: 'wall' },
        { pos: [-3, 0.75, -3],  size: [1, 1.5, 1],       type: 'crate', destructible: true },
        { pos: [3, 0.75, 3],    size: [1, 1.5, 1],       type: 'crate', destructible: true },
      ],
    },
    {
      name: 'Outpost',
      arenaSize: 56,
      wallHeight: 20,
      noCeiling: true,
      covers: [
        { pos: [0, 2, 0],       size: [3, 4, 3],       type: 'pillar' },
        { pos: [-15, 1.5, 15],  size: [4, 3, 4],       type: 'ramp_base' },
        { pos: [-15, 0.15, 18], size: [4, 0.3, 2],     type: 'ramp' },
        { pos: [15, 1.5, -15],  size: [4, 3, 4],       type: 'ramp_base' },
        { pos: [15, 0.15, -12], size: [4, 0.3, 2],     type: 'ramp' },
        { pos: [-8, 1, 0],      size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [8, 1, 0],       size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [0, 1, 10],      size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [0, 1, -10],     size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [-20, 1.5, 0],   size: [3, 3, 1],       type: 'wall' },
        { pos: [20, 1.5, 0],    size: [1, 3, 3],       type: 'wall' },
        { pos: [0, 1.5, 20],    size: [3, 3, 1],       type: 'wall' },
        { pos: [0, 1.5, -20],   size: [1, 3, 3],       type: 'wall' },
        { pos: [-10, 0.5, -10], size: [6, 1, 0.8],     type: 'wall' },
        { pos: [10, 0.5, 10],   size: [6, 1, 0.8],     type: 'wall' },
        { pos: [-22, 1, 15],    size: [1.5, 2, 1.5],   type: 'crate', destructible: true },
        { pos: [22, 1, -15],    size: [1.5, 2, 1.5],   type: 'crate', destructible: true },
        { pos: [-15, 1, -8],    size: [1.5, 2, 1.5],   type: 'crate', destructible: true },
        { pos: [15, 1, 8],      size: [1.5, 2, 1.5],   type: 'crate', destructible: true },
      ],
    },
    {
      name: 'Factory',
      arenaSize: 40,
      wallHeight: 8,
      covers: [
        { pos: [-10, 2, -10],   size: [4, 4, 4],       type: 'ramp_base' },
        { pos: [-10, 0.15, -7], size: [4, 0.3, 2],     type: 'ramp' },
        { pos: [10, 2, 10],     size: [4, 4, 4],       type: 'ramp_base' },
        { pos: [10, 0.15, 13],  size: [4, 0.3, 2],     type: 'ramp' },
        { pos: [0, 2, 0],       size: [6, 4, 0.8],     type: 'wall' },
        { pos: [-6, 1.5, 6],    size: [0.8, 3, 6],     type: 'wall' },
        { pos: [6, 1.5, -6],    size: [0.8, 3, 6],     type: 'wall' },
        { pos: [-14, 1, 6],     size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [14, 1, -6],     size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [-5, 0.75, -5],  size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [5, 0.75, 5],    size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [0, 1.5, 14],    size: [6, 3, 0.8],     type: 'wall' },
        { pos: [0, 1.5, -14],   size: [6, 3, 0.8],     type: 'wall' },
        { pos: [-14, 1.5, 0],   size: [0.8, 3, 4],     type: 'wall' },
        { pos: [14, 1.5, 0],    size: [0.8, 3, 4],     type: 'wall' },
        { pos: [-3, 3, 10],     size: [0.8, 6, 0.8],   type: 'pillar' },
        { pos: [3, 3, -10],     size: [0.8, 6, 0.8],   type: 'pillar' },
        { pos: [10, 1, 0],      size: [2, 2, 2],       type: 'crate', destructible: true },
        { pos: [-10, 1, 0],     size: [2, 2, 2],       type: 'crate', destructible: true },
      ],
    },
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
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
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

  function build(scene, layoutIndex) {
    const quality = Settings.get('graphics');
    const useShadows = quality !== 'low';
    const useTextures = quality !== 'low';
    colliders.length = 0;
    destructibles.length = 0;

    if (layoutIndex !== undefined) {
      currentLayout = layoutIndex;
    } else {
      currentLayout = Math.floor(Math.random() * LAYOUTS.length);
    }

    const layout = LAYOUTS[currentLayout];
    const ARENA_SIZE = layout.arenaSize || FPSConfig.ARENA_SIZE;
    const WALL_HEIGHT = layout.wallHeight || FPSConfig.WALL_HEIGHT;

    const floorMat = useTextures
      ? new THREE.MeshLambertMaterial({ map: createFloorTexture() })
      : new THREE.MeshLambertMaterial({ color: 0x8a8a8a });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    if (useShadows) floor.receiveShadow = true;
    scene.add(floor);

    if (!layout.noCeiling) {
      const ceilMat = useTextures
        ? new THREE.MeshLambertMaterial({ map: createCeilingTexture(), side: THREE.DoubleSide })
        : new THREE.MeshLambertMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide });
      const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
        ceilMat
      );
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = WALL_HEIGHT;
      scene.add(ceiling);

      const beamMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
      const beamCount = Math.floor(ARENA_SIZE / 8);
      for (let i = 0; i < beamCount; i++) {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(ARENA_SIZE, 0.15, 0.3), beamMat
        );
        beam.position.set(0, WALL_HEIGHT - 0.08, -ARENA_SIZE / 2 + (i + 0.5) * (ARENA_SIZE / beamCount));
        scene.add(beam);
      }

      const lightFixtureMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
      for (let x = -1; x <= 1; x += 2) {
        for (let z = -1; z <= 1; z += 2) {
          const fixture = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.08, 0.3), lightFixtureMat
          );
          fixture.position.set(x * ARENA_SIZE * 0.2, WALL_HEIGHT - 0.05, z * ARENA_SIZE * 0.2);
          scene.add(fixture);
        }
      }
    }

    const half = ARENA_SIZE / 2;
    const wallTex = useTextures ? createWallTexture() : null;

    [
      { pos: [0, WALL_HEIGHT / 2, -half], size: [ARENA_SIZE, WALL_HEIGHT, 0.5], texRepeat: [8, 2] },
      { pos: [0, WALL_HEIGHT / 2, half],  size: [ARENA_SIZE, WALL_HEIGHT, 0.5], texRepeat: [8, 2] },
      { pos: [-half, WALL_HEIGHT / 2, 0], size: [0.5, WALL_HEIGHT, ARENA_SIZE], texRepeat: [8, 2] },
      { pos: [half, WALL_HEIGHT / 2, 0],  size: [0.5, WALL_HEIGHT, ARENA_SIZE], texRepeat: [8, 2] },
    ].forEach(({ pos, size, texRepeat }) => {
      let mat;
      if (wallTex) {
        const tex = wallTex.clone();
        tex.repeat.set(...texRepeat);
        mat = new THREE.MeshLambertMaterial({ map: tex });
      } else {
        mat = new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
      }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      if (useShadows) mesh.receiveShadow = true;
      scene.add(mesh);
    });

    const coverMeshes = [];
    const colors = { wall: 0x707070, crate: 0x8B7355, pillar: 0x606060, ramp_base: 0x707070, ramp: 0x808060 };

    layout.covers.forEach((cover) => {
      const { pos, size, type, destructible } = cover;
      const color = colors[type] || 0x888888;
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      if (useShadows) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      scene.add(mesh);
      coverMeshes.push(mesh);

      const collider = {
        minX: pos[0] - size[0] / 2,
        maxX: pos[0] + size[0] / 2,
        minY: pos[1] - size[1] / 2,
        maxY: pos[1] + size[1] / 2,
        minZ: pos[2] - size[2] / 2,
        maxZ: pos[2] + size[2] / 2,
      };
      colliders.push(collider);

      if (destructible) {
        destructibles.push({ mesh, collider, hp: 50, scene });
      }
    });

    return coverMeshes;
  }

  function damageAt(point, damage) {
    for (let i = destructibles.length - 1; i >= 0; i--) {
      const d = destructibles[i];
      const c = d.collider;
      const margin = 0.5;
      if (point.x > c.minX - margin && point.x < c.maxX + margin &&
          point.y > c.minY - margin && point.y < c.maxY + margin &&
          point.z > c.minZ - margin && point.z < c.maxZ + margin) {
        d.hp -= damage;
        if (d.hp <= 0) {
          d.scene.remove(d.mesh);
          const idx = colliders.indexOf(d.collider);
          if (idx !== -1) colliders.splice(idx, 1);
          FPSEffects.explode(d.scene, d.mesh.position.clone(), 0x8B7355);
          destructibles.splice(i, 1);
        }
      }
    }
  }

  function getColliders() { return colliders; }
  function getLayoutIndex() { return currentLayout; }
  function getLayoutCount() { return LAYOUTS.length; }
  function getArenaSize() {
    return LAYOUTS[currentLayout]?.arenaSize || FPSConfig.ARENA_SIZE;
  }

  return { build, damageAt, getColliders, getLayoutIndex, getLayoutCount, getArenaSize };
})();
