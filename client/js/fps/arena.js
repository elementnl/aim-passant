const FPSArena = (() => {
  const colliders = [];
  const destructibles = [];
  let currentLayout = 0;

  const LAYOUTS = [
    {
      name: 'Warehouse',
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
        { pos: [-3, 2.5, 0],    size: [0.8, 5, 0.8],   type: 'pillar' },
        { pos: [3, 2.5, 0],     size: [0.8, 5, 0.8],   type: 'pillar' },
      ],
    },
    {
      name: 'Corridors',
      covers: [
        { pos: [-7, 2, -12],   size: [0.8, 4, 14],    type: 'wall' },
        { pos: [-7, 2, 12],    size: [0.8, 4, 14],     type: 'wall' },
        { pos: [7, 2, -12],    size: [0.8, 4, 14],     type: 'wall' },
        { pos: [7, 2, 12],     size: [0.8, 4, 14],     type: 'wall' },
        { pos: [-4, 2, -10],   size: [5, 4, 0.8],      type: 'wall' },
        { pos: [4, 2, -10],    size: [5, 4, 0.8],      type: 'wall' },
        { pos: [-4, 2, 10],    size: [5, 4, 0.8],      type: 'wall' },
        { pos: [4, 2, 10],     size: [5, 4, 0.8],      type: 'wall' },
        { pos: [-3.5, 1, 5],   size: [6, 2, 0.8],      type: 'wall' },
        { pos: [3.5, 1, -5],   size: [6, 2, 0.8],      type: 'wall' },
        { pos: [-12, 1, 5],    size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [12, 1, -5],    size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [-12, 1, -5],   size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [12, 1, 5],     size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [0, 1, 0],      size: [2, 2, 2],         type: 'crate', destructible: true },
        { pos: [-14, 1.5, 0],  size: [6, 3, 0.8],      type: 'wall' },
        { pos: [14, 1.5, 0],   size: [6, 3, 0.8],      type: 'wall' },
        { pos: [-3.5, 0.75, -14], size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [3.5, 0.75, 14],   size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [0, 1, 15],     size: [4, 2, 1.5],      type: 'crate' },
        { pos: [0, 1, -15],    size: [4, 2, 1.5],      type: 'crate' },
      ],
    },
    {
      name: 'Towers',
      covers: [
        { pos: [-10, 1.5, -10], size: [4, 3, 4],   type: 'ramp_base' },
        { pos: [-10, 0.15, -7], size: [4, 0.3, 2],  type: 'ramp', rampDir: 'z' },
        { pos: [10, 1.5, 10],   size: [4, 3, 4],    type: 'ramp_base' },
        { pos: [10, 0.15, 13],  size: [4, 0.3, 2],  type: 'ramp', rampDir: 'z' },
        { pos: [0, 2.5, 0],     size: [3, 5, 3],    type: 'pillar' },
        { pos: [-5, 1, 5],      size: [2, 2, 2],    type: 'crate', destructible: true },
        { pos: [5, 1, -5],      size: [2, 2, 2],    type: 'crate', destructible: true },
        { pos: [-14, 1, 0],     size: [2, 2, 2],    type: 'crate', destructible: true },
        { pos: [14, 1, 0],      size: [2, 2, 2],    type: 'crate', destructible: true },
        { pos: [-5, 0.5, -12],  size: [6, 1, 0.8],  type: 'wall' },
        { pos: [5, 0.5, 12],    size: [6, 1, 0.8],  type: 'wall' },
        { pos: [0, 1.5, 8],     size: [3, 3, 0.8],  type: 'wall' },
        { pos: [0, 1.5, -8],    size: [3, 3, 0.8],  type: 'wall' },
        { pos: [-16, 1, 10],    size: [1.5, 2, 1.5], type: 'crate', destructible: true },
        { pos: [16, 1, -10],    size: [1.5, 2, 1.5], type: 'crate', destructible: true },
      ],
    },
    {
      name: 'Sniper Alley',
      covers: [
        { pos: [0, 2, -14],     size: [1, 4, 10],    type: 'wall' },
        { pos: [0, 2, 14],      size: [1, 4, 10],    type: 'wall' },
        { pos: [0, 2, 0],       size: [1, 4, 8],     type: 'wall' },
        { pos: [-10, 1, 0],     size: [2, 2, 2],      type: 'crate', destructible: true },
        { pos: [10, 1, 0],      size: [2, 2, 2],      type: 'crate', destructible: true },
        { pos: [-5, 0.75, 10],  size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [5, 0.75, -10],  size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [-5, 0.75, -10], size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [5, 0.75, 10],   size: [1.5, 1.5, 1.5], type: 'crate', destructible: true },
        { pos: [-15, 1.5, 10],  size: [3, 3, 1],      type: 'wall' },
        { pos: [15, 1.5, -10],  size: [3, 3, 1],      type: 'wall' },
        { pos: [-15, 1.5, -10], size: [1, 3, 3],      type: 'wall' },
        { pos: [15, 1.5, 10],   size: [1, 3, 3],      type: 'wall' },
        { pos: [-8, 1.5, 0],    size: [0.8, 3, 8],    type: 'wall' },
        { pos: [8, 1.5, 0],     size: [0.8, 3, 8],    type: 'wall' },
        { pos: [0, 1, 16],      size: [6, 2, 1.5],    type: 'crate' },
        { pos: [0, 1, -16],     size: [6, 2, 1.5],    type: 'crate' },
        { pos: [-12, 2, -5],    size: [4, 4, 4],      type: 'ramp_base' },
        { pos: [-12, 0.15, -2], size: [4, 0.3, 2],    type: 'ramp', rampDir: 'z' },
        { pos: [12, 2, 5],      size: [4, 4, 4],      type: 'ramp_base' },
        { pos: [12, 0.15, 8],   size: [4, 0.3, 2],    type: 'ramp', rampDir: 'z' },
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
    const { ARENA_SIZE, WALL_HEIGHT } = FPSConfig;
    colliders.length = 0;
    destructibles.length = 0;

    if (layoutIndex !== undefined) {
      currentLayout = layoutIndex;
    } else {
      currentLayout = Math.floor(Math.random() * LAYOUTS.length);
    }

    const floorTex = createFloorTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
      new THREE.MeshLambertMaterial({ map: floorTex })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
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
    const colors = { wall: 0x707070, crate: 0x8B7355, pillar: 0x606060, ramp_base: 0x707070, ramp: 0x808060 };
    const layout = LAYOUTS[currentLayout];

    layout.covers.forEach((cover) => {
      const { pos, size, type, destructible } = cover;
      const color = colors[type] || 0x888888;
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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

  return { build, damageAt, getColliders, getLayoutIndex, getLayoutCount };
})();
