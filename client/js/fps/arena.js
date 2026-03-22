const FPSArena = (() => {
  const colliders = [];
  const destructibles = [];
  let coverMeshesInternal = [];
  let currentLayout = 0;
  const destroyedIndices = new Set();

  const LAYOUTS = [
    {
      name: 'Warehouse',
      arenaSize: 40,
      wallHeight: 10,
      theme: {
        floor: 0x5a5a5e,
        floorAccent: 0x4a4a4e,
        floorLine: 0x6a6a44,
        wall: 0x4a4a52,
        wallTrim: 0x3a3a42,
        wallAccent: 0xcc8833,
        ceiling: 0x3a3a40,
        crate: 0x8a7040,
        crateTrim: 0x6a5530,
        concrete: 0x606068,
        concreteTrim: 0x505058,
        pillar: 0x55555d,
        pillarAccent: 0xcc8833,
        fogColor: 0x1a1815,
        fogNear: 20,
        fogFar: 42,
        accentColor: 0xff8844,
      },
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
      theme: {
        floor: 0x4a4e42,
        floorAccent: 0x424640,
        floorLine: 0x5a5540,
        wall: 0x484c44,
        wallTrim: 0x3a3e36,
        wallAccent: 0x5a6050,
        ceiling: 0x353832,
        crate: 0x556044,
        crateTrim: 0x445035,
        concrete: 0x505448,
        concreteTrim: 0x424640,
        pillar: 0x484c44,
        pillarAccent: 0x5a6050,
        fogColor: 0x181a16,
        fogNear: 12,
        fogFar: 28,
        accentColor: 0x44aa66,
      },
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
      outdoor: true,
      theme: {
        floor: 0xb8a070,
        floorAccent: 0xa89060,
        wall: 0x8a7a5a,
        wallTrim: 0x7a6a4a,
        wallAccent: 0x907848,
        ceiling: 0x3a3a40,
        crate: 0x7a7050,
        crateTrim: 0x5a5540,
        concrete: 0x8a8070,
        concreteTrim: 0x7a7060,
        pillar: 0x706858,
        pillarAccent: 0x907848,
        fogColor: 0xc8b898,
        fogNear: 30,
        fogFar: 60,
        accentColor: 0xccaa55,
        skyTop: 0x4488cc,
        skyHorizon: 0xc8b898,
        sunColor: 0xffeebb,
        cliffColor: 0x8a7a5a,
        cliffDark: 0x6a5a3a,
        fenceColor: 0x888888,
        fencePost: 0x666655,
      },
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
      arenaSize: 44,
      wallHeight: 20,
      noCeiling: true,
      outdoor: true,
      hasBuilding: true,
      theme: {
        floor: 0x6a6258,
        floorAccent: 0x5a5548,
        floorIndoor: 0x4a4440,
        wall: 0x504540,
        wallTrim: 0x3a3530,
        wallAccent: 0x8a3030,
        ceiling: 0x383430,
        crate: 0x6a5040,
        crateTrim: 0x4a3830,
        concrete: 0x585048,
        concreteTrim: 0x484038,
        pillar: 0x504840,
        pillarAccent: 0x8a3030,
        fogColor: 0x908878,
        fogNear: 25,
        fogFar: 48,
        accentColor: 0xcc5544,
        skyTop: 0x5588bb,
        skyHorizon: 0x908878,
        buildingWall: 0x484038,
        buildingRoof: 0x3a3530,
        fenceColor: 0x888888,
        fencePost: 0x666655,
      },
      covers: [
        { pos: [-15, 1, -10],   size: [2, 2, 2],        type: 'crate', destructible: true },
        { pos: [-10, 1, -15],   size: [2, 2, 2],        type: 'crate', destructible: true },
        { pos: [-18, 1, -18],   size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [-5, 0.75, -5],  size: [1.5, 1.5, 1.5],  type: 'crate', destructible: true },
        { pos: [-12, 1, -5],    size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [-15, 3.5, -15], size: [0.8, 7, 0.8],    type: 'pillar' },
        { pos: [-7, 3.5, -15],  size: [0.8, 7, 0.8],    type: 'pillar' },
        { pos: [-15, 3.5, -7],  size: [0.8, 7, 0.8],    type: 'pillar' },
        { pos: [-8, 1.5, -18],  size: [4, 3, 0.8],      type: 'wall' },
        { pos: [-18, 1.5, -10], size: [0.8, 3, 4],      type: 'wall' },
        { pos: [-12, 1.5, -12], size: [3, 3, 0.8],      type: 'wall' },

        { pos: [8, 1, 8],       size: [2, 2, 2],         type: 'crate', destructible: true },
        { pos: [14, 1, -5],     size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [5, 1, 14],      size: [1.5, 2, 1.5],    type: 'crate', destructible: true },
        { pos: [17, 1, 17],     size: [2, 2, 2],         type: 'crate', destructible: true },
        { pos: [12, 1.5, 0],    size: [3, 3, 1],         type: 'wall' },
        { pos: [0, 1.5, 12],    size: [1, 3, 3],         type: 'wall' },
        { pos: [3, 0.5, -3],    size: [4, 1, 0.8],       type: 'wall' },
        { pos: [16, 2, -16],    size: [4, 4, 4],          type: 'ramp_base' },
        { pos: [16, 0.15, -13], size: [4, 0.3, 2],       type: 'ramp' },
        { pos: [18, 0.5, 10],   size: [3, 1, 0.8],       type: 'wall' },
      ],
    },
  ];

  function hexToRgb(hex) {
    return {
      r: (hex >> 16) & 255,
      g: (hex >> 8) & 255,
      b: hex & 255,
    };
  }

  function rgbStr(r, g, b) { return `rgb(${r},${g},${b})`; }

  function shade(hex, amount) {
    const c = hexToRgb(hex);
    return rgbStr(
      Math.max(0, Math.min(255, c.r + amount)),
      Math.max(0, Math.min(255, c.g + amount)),
      Math.max(0, Math.min(255, c.b + amount))
    );
  }

  function createThemedFloorTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const c = hexToRgb(baseColor || 0x5a5a5e);

    ctx.fillStyle = rgbStr(c.r, c.g, c.b);
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = shade(baseColor || 0x5a5a5e, -8);
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          ctx.fillRect(x, y, 32, 32);
        }
      }
    }

    ctx.strokeStyle = shade(baseColor || 0x5a5a5e, -18);
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }

    ctx.fillStyle = shade(baseColor || 0x5a5a5e, 5);
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        ctx.fillRect(x + 2, y + 2, 2, 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
  }

  function createThemedWallTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = shade(baseColor || 0x4a4a52, 0);
    ctx.fillRect(0, 0, 64, 64);

    const panelColor = shade(baseColor || 0x4a4a52, 6);
    ctx.fillStyle = panelColor;
    for (let x = 0; x < 64; x += 16) {
      ctx.fillRect(x + 1, 1, 14, 62);
    }

    ctx.strokeStyle = shade(baseColor || 0x4a4a52, -12);
    ctx.lineWidth = 1;
    for (let x = 0; x <= 64; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(64, 32); ctx.stroke();

    ctx.fillStyle = shade(baseColor || 0x4a4a52, -6);
    for (let x = 0; x < 64; x += 16) {
      ctx.fillRect(x + 6, 14, 4, 4);
      ctx.fillRect(x + 6, 46, 4, 4);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function createThemedCeilingTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = shade(baseColor || 0x3a3a40, 0);
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = shade(baseColor || 0x3a3a40, 5);
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        ctx.fillRect(x + 2, y + 2, 28, 28);
      }
    }

    ctx.strokeStyle = shade(baseColor || 0x3a3a40, -10);
    ctx.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }

    ctx.fillStyle = shade(baseColor || 0x3a3a40, -5);
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        ctx.fillRect(x + 12, y + 12, 8, 8);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  function createThemedCrateTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = shade(baseColor || 0x8a7040, 0);
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = shade(baseColor || 0x8a7040, -10);
    for (let y = 0; y < 64; y += 8) {
      ctx.fillRect(0, y, 64, 1);
    }

    ctx.fillStyle = shade(baseColor || 0x8a7040, 8);
    for (let y = 0; y < 64; y += 8) {
      ctx.fillRect(0, y + 3, 64, 2);
    }

    ctx.fillStyle = shade(baseColor || 0x8a7040, -20);
    ctx.fillRect(0, 0, 64, 2);
    ctx.fillRect(0, 62, 64, 2);
    ctx.fillRect(0, 0, 2, 64);
    ctx.fillRect(62, 0, 2, 64);
    ctx.fillRect(0, 31, 64, 2);
    ctx.fillRect(31, 0, 2, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function createThemedConcreteTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = shade(baseColor || 0x606068, 0);
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = shade(baseColor || 0x606068, -8);
    for (let y = 0; y < 64; y += 16) {
      const offset = (y % 32 === 0) ? 0 : 16;
      for (let x = offset; x < 64; x += 32) {
        ctx.fillRect(x + 1, y + 1, 30, 14);
      }
    }

    ctx.strokeStyle = shade(baseColor || 0x606068, -15);
    ctx.lineWidth = 1;
    for (let y = 0; y <= 64; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
    }

    ctx.fillStyle = shade(baseColor || 0x606068, 4);
    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 16) {
        ctx.fillRect(x + 5, y + 5, 2, 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function buildSkybox(scene, t) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const topC = hexToRgb(t.skyTop || 0x4488cc);
    const botC = hexToRgb(t.skyHorizon || 0xc8b898);
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, rgbStr(topC.r, topC.g, topC.b));
    grad.addColorStop(0.5, rgbStr(
      Math.round((topC.r + botC.r) / 2),
      Math.round((topC.g + botC.g) / 2),
      Math.round((topC.b + botC.b) / 2)
    ));
    grad.addColorStop(1, rgbStr(botC.r, botC.g, botC.b));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 256);

    const skyTex = new THREE.CanvasTexture(canvas);
    const skyGeo = new THREE.SphereGeometry(80, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.y = 5;
    scene.add(sky);

    const sunGeo = new THREE.SphereGeometry(2, 8, 6);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(30, 40, -20);
    scene.add(sun);

    const sunGlow = new THREE.PointLight(t.sunColor || 0xffeebb, 0.3, 100);
    sunGlow.position.copy(sun.position);
    scene.add(sunGlow);
  }

  function buildOutdoorBoundary(scene, half, wallHeight, t, useShadows) {
    const ARENA_SIZE = half * 2;
    const cliffMat = new THREE.MeshLambertMaterial({ color: t.cliffColor || 0x8a7a5a });
    const cliffDarkMat = new THREE.MeshLambertMaterial({ color: t.cliffDark || 0x6a5a3a });
    const fenceMat = new THREE.MeshLambertMaterial({ color: t.fenceColor || 0x888888 });
    const postMat = new THREE.MeshLambertMaterial({ color: t.fencePost || 0x666655 });

    const cliffH = 12;
    const cliff1 = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE + 4, cliffH, 3), cliffMat);
    cliff1.position.set(0, cliffH / 2 - 1, -half - 1.5);
    if (useShadows) cliff1.castShadow = true;
    scene.add(cliff1);

    for (let x = -half; x <= half; x += 6) {
      const jut = new THREE.Mesh(
        new THREE.BoxGeometry(2 + Math.random() * 2, cliffH * (0.6 + Math.random() * 0.4), 1.5 + Math.random()),
        Math.random() > 0.5 ? cliffMat : cliffDarkMat
      );
      jut.position.set(x + Math.random() * 3, jut.geometry.parameters.height / 2 - 1, -half - 0.5);
      scene.add(jut);
    }

    const cliff2 = new THREE.Mesh(new THREE.BoxGeometry(3, cliffH, ARENA_SIZE + 4), cliffMat);
    cliff2.position.set(-half - 1.5, cliffH / 2 - 1, 0);
    if (useShadows) cliff2.castShadow = true;
    scene.add(cliff2);

    for (let z = -half; z <= half; z += 6) {
      const jut = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 + Math.random(), cliffH * (0.5 + Math.random() * 0.5), 2 + Math.random() * 2),
        Math.random() > 0.5 ? cliffMat : cliffDarkMat
      );
      jut.position.set(-half - 0.5, jut.geometry.parameters.height / 2 - 1, z + Math.random() * 3);
      scene.add(jut);
    }

    const fenceH = 3;
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, 0.08, 0.08), fenceMat);
    railTop.position.set(0, fenceH, half);
    scene.add(railTop);
    const railMid = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, 0.08, 0.08), fenceMat);
    railMid.position.set(0, fenceH * 0.5, half);
    scene.add(railMid);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, 0.08, 0.08), fenceMat);
    railBot.position.set(0, 0.2, half);
    scene.add(railBot);

    for (let x = -half; x <= half; x += 3) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, fenceH + 0.3, 0.15), postMat);
      post.position.set(x, fenceH / 2, half);
      scene.add(post);
    }

    const wire = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, 0.4, 0.1), fenceMat);
    wire.position.set(0, fenceH + 0.2, half);
    scene.add(wire);

    const railTop2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, ARENA_SIZE), fenceMat);
    railTop2.position.set(half, fenceH, 0);
    scene.add(railTop2);
    const railMid2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, ARENA_SIZE), fenceMat);
    railMid2.position.set(half, fenceH * 0.5, 0);
    scene.add(railMid2);
    const railBot2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, ARENA_SIZE), fenceMat);
    railBot2.position.set(half, 0.2, 0);
    scene.add(railBot2);

    for (let z = -half; z <= half; z += 3) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, fenceH + 0.3, 0.15), postMat);
      post.position.set(half, fenceH / 2, z);
      scene.add(post);
    }

    const wire2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, ARENA_SIZE), fenceMat);
    wire2.position.set(half, fenceH + 0.2, 0);
    scene.add(wire2);

    colliders.push(
      { minX: -half - 3, maxX: -half, minY: 0, maxY: 15, minZ: -half - 3, maxZ: half + 3 },
      { minX: -half - 3, maxX: half + 3, minY: 0, maxY: 15, minZ: -half - 3, maxZ: -half },
      { minX: half, maxX: half + 3, minY: 0, maxY: 15, minZ: -half - 3, maxZ: half + 3 },
      { minX: -half - 3, maxX: half + 3, minY: 0, maxY: 15, minZ: half, maxZ: half + 3 },
    );

    const groundExtend = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshLambertMaterial({ color: t.floorAccent || 0xa89060 })
    );
    groundExtend.rotation.x = -Math.PI / 2;
    groundExtend.position.y = -0.02;
    scene.add(groundExtend);
  }

  function createThemedSandTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const c = hexToRgb(baseColor || 0xb8a070);

    ctx.fillStyle = rgbStr(c.r, c.g, c.b);
    ctx.fillRect(0, 0, 128, 128);

    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const v = Math.round((Math.random() - 0.5) * 15);
      ctx.fillStyle = rgbStr(
        Math.max(0, Math.min(255, c.r + v)),
        Math.max(0, Math.min(255, c.g + v)),
        Math.max(0, Math.min(255, c.b + v))
      );
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    ctx.strokeStyle = shade(baseColor || 0xb8a070, -12);
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 20 + i * 25 + Math.random() * 10);
      ctx.lineTo(128, 22 + i * 25 + Math.random() * 10);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
  }

  function build(scene, layoutIndex) {
    const useShadows = Settings.get('shadows') !== false;
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
    const t = layout.theme || {};
    const half = ARENA_SIZE / 2;

    if (t.fogColor !== undefined) {
      scene.fog = new THREE.Fog(t.fogColor, t.fogNear || 20, t.fogFar || 42);
    }

    if (layout.outdoor) {
      buildSkybox(scene, t);
      scene.fog = new THREE.Fog(t.fogColor || 0xc8b898, t.fogNear || 30, t.fogFar || 60);
      if (typeof FPSRenderer !== 'undefined' && FPSRenderer.getRenderer) {
        FPSRenderer.getRenderer().setClearColor(t.skyHorizon || 0xc8b898);
      }
    }

    const useTextures = Settings.get('textures') !== false;
    let floorMat;
    if (layout.outdoor && useTextures) {
      floorMat = new THREE.MeshLambertMaterial({ map: createThemedSandTexture(t.floor) });
    } else if (useTextures) {
      floorMat = new THREE.MeshLambertMaterial({ map: createThemedFloorTexture(t.floor) });
    } else {
      floorMat = new THREE.MeshLambertMaterial({ color: t.floor || 0x5a5a5e });
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), floorMat);
    floor.rotation.x = -Math.PI / 2;
    if (useShadows) floor.receiveShadow = true;
    scene.add(floor);

    if (t.floorLine) {
      const lineMat = new THREE.MeshLambertMaterial({ color: t.floorLine });
      for (let i = -3; i <= 3; i += 2) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE * 0.6, 0.01, 0.15), lineMat);
        line.position.set(0, 0.005, i * 3);
        scene.add(line);
      }
      const centerCircle = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.7, 24), lineMat);
      centerCircle.rotation.x = -Math.PI / 2;
      centerCircle.position.y = 0.005;
      scene.add(centerCircle);
    }

    if (t.floorAccent) {
      const accentMat = new THREE.MeshLambertMaterial({ color: t.floorAccent });
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          if ((x + z) % 2 === 0) continue;
          const tile = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE / 5 - 0.1, 0.01, ARENA_SIZE / 5 - 0.1), accentMat);
          tile.position.set(x * ARENA_SIZE / 5, 0.003, z * ARENA_SIZE / 5);
          scene.add(tile);
        }
      }
    }

    if (layout.outdoor) {
      buildOutdoorBoundary(scene, half, WALL_HEIGHT, t, useShadows);
    } else {
      const wallMat = useTextures
        ? new THREE.MeshLambertMaterial({ map: createThemedWallTexture(t.wall) })
        : new THREE.MeshLambertMaterial({ color: t.wall || 0x4a4a52 });
      const wallTrimMat = new THREE.MeshLambertMaterial({ color: t.wallTrim || 0x3a3a42 });
      const wallAccentMat = new THREE.MeshLambertMaterial({ color: t.wallAccent || 0x996633 });

      [
        { pos: [0, WALL_HEIGHT / 2, -half], size: [ARENA_SIZE, WALL_HEIGHT, 0.5], along: 'x', len: ARENA_SIZE },
        { pos: [0, WALL_HEIGHT / 2, half],  size: [ARENA_SIZE, WALL_HEIGHT, 0.5], along: 'x', len: ARENA_SIZE },
        { pos: [-half, WALL_HEIGHT / 2, 0], size: [0.5, WALL_HEIGHT, ARENA_SIZE], along: 'z', len: ARENA_SIZE },
        { pos: [half, WALL_HEIGHT / 2, 0],  size: [0.5, WALL_HEIGHT, ARENA_SIZE], along: 'z', len: ARENA_SIZE },
      ].forEach(({ pos, size, along, len }) => {
        let wMat = wallMat;
        if (useTextures) {
          const wTex = createThemedWallTexture(t.wall);
          wTex.repeat.set(Math.round(len / 5), Math.round(WALL_HEIGHT / 3));
          wMat = new THREE.MeshLambertMaterial({ map: wTex });
        }
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wMat);
        mesh.position.set(...pos);
        if (useShadows) mesh.receiveShadow = true;
        scene.add(mesh);

        const baseboard = new THREE.Mesh(
          along === 'x' ? new THREE.BoxGeometry(len, 0.3, 0.55) : new THREE.BoxGeometry(0.55, 0.3, len),
          wallTrimMat
        );
        baseboard.position.set(pos[0], 0.15, pos[2]);
        scene.add(baseboard);

        const topTrim = new THREE.Mesh(
          along === 'x' ? new THREE.BoxGeometry(len, 0.08, 0.55) : new THREE.BoxGeometry(0.55, 0.08, len),
          wallTrimMat
        );
        topTrim.position.set(pos[0], WALL_HEIGHT * 0.4, pos[2]);
        scene.add(topTrim);

        const accentStripe = new THREE.Mesh(
          along === 'x' ? new THREE.BoxGeometry(len, 0.05, 0.52) : new THREE.BoxGeometry(0.52, 0.05, len),
          wallAccentMat
        );
        accentStripe.position.set(pos[0], 1.2, pos[2]);
        scene.add(accentStripe);
      });
    }

    if (!layout.noCeiling) {
      const ceilMat = useTextures
        ? new THREE.MeshLambertMaterial({ map: createThemedCeilingTexture(t.ceiling), side: THREE.DoubleSide })
        : new THREE.MeshLambertMaterial({ color: t.ceiling || 0x3a3a40, side: THREE.DoubleSide });
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), ceilMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = WALL_HEIGHT;
      scene.add(ceiling);

      const beamMat = new THREE.MeshLambertMaterial({ color: t.pillar || 0x55555d });
      const beamCount = Math.floor(ARENA_SIZE / 10);
      for (let i = 0; i <= beamCount; i++) {
        const zPos = -half + i * (ARENA_SIZE / beamCount);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE, 0.25, 0.3), beamMat);
        beam.position.set(0, WALL_HEIGHT - 0.13, zPos);
        scene.add(beam);
      }
      for (let i = 0; i <= beamCount; i++) {
        const xPos = -half + i * (ARENA_SIZE / beamCount);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, ARENA_SIZE), beamMat);
        beam.position.set(xPos, WALL_HEIGHT - 0.08, 0);
        scene.add(beam);
      }

      const isLowCeiling = WALL_HEIGHT < 5;
      const fixtureMat = new THREE.MeshBasicMaterial({ color: isLowCeiling ? 0xddddaa : 0xffffdd });
      const fixtureDark = new THREE.MeshLambertMaterial({ color: 0x444444 });
      const fixtureSpacing = isLowCeiling ? 0.35 : 0.25;

      for (let x = -1; x <= 1; x += (isLowCeiling ? 2 : 1)) {
        for (let z = -1; z <= 1; z += (isLowCeiling ? 2 : 1)) {
          const fx = x * ARENA_SIZE * fixtureSpacing;
          const fz = z * ARENA_SIZE * fixtureSpacing;
          const housing = new THREE.Mesh(new THREE.BoxGeometry(isLowCeiling ? 0.8 : 1.2, 0.1, 0.3), fixtureDark);
          housing.position.set(fx, WALL_HEIGHT - 0.05, fz);
          scene.add(housing);
          const bulbMesh = new THREE.Mesh(new THREE.BoxGeometry(isLowCeiling ? 0.5 : 0.8, 0.03, 0.2), fixtureMat);
          bulbMesh.position.set(fx, WALL_HEIGHT - 0.11, fz);
          scene.add(bulbMesh);
          const light = new THREE.PointLight(
            isLowCeiling ? 0xddddaa : 0xffeedd,
            isLowCeiling ? 0.35 : 0.25,
            isLowCeiling ? 8 : 14
          );
          light.position.set(fx, WALL_HEIGHT - 0.2, fz);
          scene.add(light);
        }
      }

      if (isLowCeiling) {
        const pipeMat = new THREE.MeshLambertMaterial({ color: 0x555550 });
        const pipeAccent = new THREE.MeshLambertMaterial({ color: 0x664433 });
        for (let i = -1; i <= 1; i += 2) {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ARENA_SIZE, 6), pipeMat);
          pipe.rotation.z = Math.PI / 2;
          pipe.position.set(0, WALL_HEIGHT - 0.25, i * ARENA_SIZE * 0.3);
          scene.add(pipe);

          const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ARENA_SIZE, 6), pipeAccent);
          pipe2.rotation.x = Math.PI / 2;
          pipe2.position.set(i * ARENA_SIZE * 0.25, WALL_HEIGHT - 0.35, 0);
          scene.add(pipe2);

          for (let j = -2; j <= 2; j++) {
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.15), pipeMat);
            bracket.position.set(j * ARENA_SIZE * 0.2, WALL_HEIGHT - 0.2, i * ARENA_SIZE * 0.3);
            scene.add(bracket);
          }
        }

        const ventMat = new THREE.MeshLambertMaterial({ color: 0x3a3e36 });
        for (let i = -1; i <= 1; i += 2) {
          const vent = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), ventMat);
          vent.position.set(i * ARENA_SIZE * 0.35, WALL_HEIGHT - 0.04, 0);
          scene.add(vent);
        }
      }
    }

    if (layout.hasBuilding) {
      const bldgH = 8;
      const bldgSize = half * 1.3;
      const bx = -half + bldgSize / 2;
      const bz = -half + bldgSize / 2;

      const bWallMat = new THREE.MeshLambertMaterial({ color: t.buildingWall || 0x484038 });
      const bTrimMat = new THREE.MeshLambertMaterial({ color: t.wallTrim || 0x3a3530 });
      const bRoofMat = new THREE.MeshLambertMaterial({ color: t.buildingRoof || 0x3a3530, side: THREE.DoubleSide });
      const accentMat = new THREE.MeshLambertMaterial({ color: t.wallAccent || 0x8a3030 });

      const roof = new THREE.Mesh(new THREE.PlaneGeometry(bldgSize, bldgSize), bRoofMat);
      roof.rotation.x = Math.PI / 2;
      roof.position.set(bx, bldgH, bz);
      scene.add(roof);

      const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(bldgSize + 0.4, 0.2, bldgSize + 0.4), bTrimMat);
      roofEdge.position.set(bx, bldgH + 0.1, bz);
      scene.add(roofEdge);

      const mainDoorGap = 6;
      const sideDoorGap = 2.5;
      const sideDoorH = 3;
      const xWallZ = bx + bldgSize / 2;
      const zWallZ = bz + bldgSize / 2;

      const mainDoorStart = bz - mainDoorGap / 2;
      const mainDoorEnd = bz + mainDoorGap / 2;
      const seg1Len = mainDoorStart - (bz - bldgSize / 2);
      const seg2Len = (bz + bldgSize / 2) - mainDoorEnd;

      const xSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, bldgH, seg1Len), bWallMat);
      xSeg1.position.set(xWallZ, bldgH / 2, (bz - bldgSize / 2 + mainDoorStart) / 2);
      if (useShadows) { xSeg1.castShadow = true; }
      scene.add(xSeg1);

      const xSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, bldgH, seg2Len), bWallMat);
      xSeg2.position.set(xWallZ, bldgH / 2, (mainDoorEnd + bz + bldgSize / 2) / 2);
      if (useShadows) { xSeg2.castShadow = true; }
      scene.add(xSeg2);

      colliders.push({ minX: xWallZ - 0.25, maxX: xWallZ + 0.25, minY: 0, maxY: bldgH, minZ: bz - bldgSize / 2, maxZ: mainDoorStart });
      colliders.push({ minX: xWallZ - 0.25, maxX: xWallZ + 0.25, minY: 0, maxY: bldgH, minZ: mainDoorEnd, maxZ: bz + bldgSize / 2 });

      const acXseg1 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, seg1Len), accentMat);
      acXseg1.position.set(xWallZ, 1.2, (bz - bldgSize / 2 + mainDoorStart) / 2);
      scene.add(acXseg1);
      const acXseg2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, seg2Len), accentMat);
      acXseg2.position.set(xWallZ, 1.2, (mainDoorEnd + bz + bldgSize / 2) / 2);
      scene.add(acXseg2);

      const sideDoorStart = bx - bldgSize / 2 + 1;
      const sideDoorEnd = sideDoorStart + sideDoorGap;
      const zSeg1Len = sideDoorStart - (bx - bldgSize / 2);
      const zSeg2Len = (bx + bldgSize / 2) - sideDoorEnd;

      const zSeg1 = new THREE.Mesh(new THREE.BoxGeometry(zSeg1Len, bldgH, 0.5), bWallMat);
      zSeg1.position.set((bx - bldgSize / 2 + sideDoorStart) / 2, bldgH / 2, zWallZ);
      scene.add(zSeg1);

      const zSeg2 = new THREE.Mesh(new THREE.BoxGeometry(zSeg2Len, bldgH, 0.5), bWallMat);
      zSeg2.position.set((sideDoorEnd + bx + bldgSize / 2) / 2, bldgH / 2, zWallZ);
      scene.add(zSeg2);

      const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(sideDoorGap + 0.1, bldgH - sideDoorH, 0.5), bWallMat);
      doorLintel.position.set((sideDoorStart + sideDoorEnd) / 2, sideDoorH + (bldgH - sideDoorH) / 2, zWallZ);
      scene.add(doorLintel);

      colliders.push({ minX: bx - bldgSize / 2, maxX: sideDoorStart, minY: 0, maxY: bldgH, minZ: zWallZ - 0.25, maxZ: zWallZ + 0.25 });
      colliders.push({ minX: sideDoorEnd, maxX: bx + bldgSize / 2, minY: 0, maxY: bldgH, minZ: zWallZ - 0.25, maxZ: zWallZ + 0.25 });
      colliders.push({ minX: sideDoorStart, maxX: sideDoorEnd, minY: sideDoorH, maxY: bldgH, minZ: zWallZ - 0.25, maxZ: zWallZ + 0.25 });

      const acZseg1 = new THREE.Mesh(new THREE.BoxGeometry(zSeg1Len, 0.06, 0.52), accentMat);
      acZseg1.position.set((bx - bldgSize / 2 + sideDoorStart) / 2, 1.2, zWallZ);
      scene.add(acZseg1);
      const acZseg2 = new THREE.Mesh(new THREE.BoxGeometry(zSeg2Len, 0.06, 0.52), accentMat);
      acZseg2.position.set((sideDoorEnd + bx + bldgSize / 2) / 2, 1.2, zWallZ);
      scene.add(acZseg2);

      const beamMat = new THREE.MeshLambertMaterial({ color: t.pillar || 0x504840 });
      for (let i = 0; i < 3; i++) {
        const bm = new THREE.Mesh(new THREE.BoxGeometry(bldgSize, 0.15, 0.25), beamMat);
        bm.position.set(bx, bldgH - 0.08, bz - bldgSize / 2 + (i + 0.5) * bldgSize / 3);
        scene.add(bm);
      }

      const pipeMat = new THREE.MeshLambertMaterial({ color: 0x555550 });
      const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, bldgSize, 6), pipeMat);
      pipe1.rotation.z = Math.PI / 2;
      pipe1.position.set(bx, bldgH - 0.25, bz - 3);
      scene.add(pipe1);
      const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, bldgSize, 6), pipeMat);
      pipe2.rotation.x = Math.PI / 2;
      pipe2.position.set(bx + 3, bldgH - 0.3, bz);
      scene.add(pipe2);

      const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xddddaa });
      const fixtureDark = new THREE.MeshLambertMaterial({ color: 0x444444 });
      for (let ix = -1; ix <= 0; ix++) {
        for (let iz = -1; iz <= 0; iz++) {
          const fx = bx + ix * bldgSize * 0.3;
          const fz = bz + iz * bldgSize * 0.3;
          const housing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.3), fixtureDark);
          housing.position.set(fx, bldgH - 0.04, fz);
          scene.add(housing);
          const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.2), fixtureMat);
          bulb.position.set(fx, bldgH - 0.1, fz);
          scene.add(bulb);
          const lt = new THREE.PointLight(0xddaa88, 0.35, 8);
          lt.position.set(fx, bldgH - 0.3, fz);
          scene.add(lt);
        }
      }

      if (t.floorIndoor) {
        const indoorFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(bldgSize, bldgSize),
          new THREE.MeshLambertMaterial({ color: t.floorIndoor })
        );
        indoorFloor.rotation.x = -Math.PI / 2;
        indoorFloor.position.set(bx, 0.005, bz);
        scene.add(indoorFloor);
      }

      const doorLight = new THREE.PointLight(0xffeedd, 0.5, 12);
      doorLight.position.set(bx + bldgSize / 2, 3, bz);
      scene.add(doorLight);
    }

    coverMeshesInternal = [];
    const coverMeshes = coverMeshesInternal;

    layout.covers.forEach((cover, coverIndex) => {
      if (destroyedIndices.has(coverIndex)) return;

      const { pos, size, type, destructible } = cover;

      const group = new THREE.Group();
      group.position.set(...pos);

      if (type === 'crate') {
        const bodyMat = useTextures
          ? new THREE.MeshLambertMaterial({ map: createThemedCrateTexture(t.crate) })
          : new THREE.MeshLambertMaterial({ color: t.crate || 0x8a7040 });
        const trimMat = new THREE.MeshLambertMaterial({ color: t.crateTrim || 0x6a5530 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(...size), bodyMat);
        group.add(body);
        const bandH = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.02, 0.08, size[2] + 0.02), trimMat);
        bandH.position.y = size[1] * 0.25;
        group.add(bandH);
        const bandH2 = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.02, 0.08, size[2] + 0.02), trimMat);
        bandH2.position.y = -size[1] * 0.25;
        group.add(bandH2);
        const bandV = new THREE.Mesh(new THREE.BoxGeometry(0.08, size[1] + 0.02, size[2] + 0.02), trimMat);
        group.add(bandV);
      } else if (type === 'pillar') {
        const pillarMat = new THREE.MeshLambertMaterial({ color: t.pillar || 0x55555d });
        const accentMat = new THREE.MeshBasicMaterial({ color: t.pillarAccent || 0xcc8833 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), pillarMat);
        group.add(body);
        const flange = new THREE.Mesh(new THREE.BoxGeometry(size[0] * 1.8, 0.15, size[2] * 1.8), pillarMat);
        flange.position.y = -size[1] / 2 + 0.08;
        group.add(flange);
        const topFlange = new THREE.Mesh(new THREE.BoxGeometry(size[0] * 1.5, 0.1, size[2] * 1.5), pillarMat);
        topFlange.position.y = size[1] / 2 - 0.05;
        group.add(topFlange);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.02, 0.06, size[2] + 0.02), accentMat);
        stripe.position.y = -size[1] / 2 + 0.5;
        group.add(stripe);
      } else {
        let concMat;
        if (useTextures) {
          const concTex = createThemedConcreteTexture(t.concrete);
          concTex.repeat.set(Math.max(1, Math.round(Math.max(size[0], size[2]) / 2)), Math.max(1, Math.round(size[1] / 2)));
          concMat = new THREE.MeshLambertMaterial({ map: concTex });
        } else {
          concMat = new THREE.MeshLambertMaterial({ color: t.concrete || 0x606068 });
        }
        const trimMat = new THREE.MeshLambertMaterial({ color: t.concreteTrim || 0x505058 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(...size), concMat);
        group.add(body);
        const topCap = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.06, 0.08, size[2] + 0.06), trimMat);
        topCap.position.y = size[1] / 2;
        group.add(topCap);
        const botCap = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.04, 0.06, size[2] + 0.04), trimMat);
        botCap.position.y = -size[1] / 2;
        group.add(botCap);
      }

      if (useShadows) {
        group.traverse(child => {
          if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
      }
      scene.add(group);
      coverMeshes.push(group);

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
        destructibles.push({ mesh: group, collider, hp: 50, scene, coverIndex });
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
          destroyedIndices.add(d.coverIndex);
          d.scene.remove(d.mesh);
          const idx = colliders.indexOf(d.collider);
          if (idx !== -1) colliders.splice(idx, 1);
          const cmIdx = coverMeshesInternal.indexOf(d.mesh);
          if (cmIdx !== -1) coverMeshesInternal.splice(cmIdx, 1);
          FPSEffects.explode(d.scene, d.mesh.position.clone(), 0x8B7355);
          Network.emit('duel-crate-destroy', { coverIndex: d.coverIndex });
          destructibles.splice(i, 1);
        }
      }
    }
  }

  function destroyCrate(coverIndex) {
    if (destroyedIndices.has(coverIndex)) return;
    destroyedIndices.add(coverIndex);
    for (let i = destructibles.length - 1; i >= 0; i--) {
      if (destructibles[i].coverIndex === coverIndex) {
        const d = destructibles[i];
        d.scene.remove(d.mesh);
        const idx = colliders.indexOf(d.collider);
        if (idx !== -1) colliders.splice(idx, 1);
        const cmIdx = coverMeshesInternal.indexOf(d.mesh);
        if (cmIdx !== -1) coverMeshesInternal.splice(cmIdx, 1);
        FPSEffects.explode(d.scene, d.mesh.position.clone(), 0x8B7355);
        destructibles.splice(i, 1);
        break;
      }
    }
  }

  function resetDestroyed() {
    destroyedIndices.clear();
  }

  function getColliders() { return colliders; }
  function getLayoutIndex() { return currentLayout; }
  function getLayoutCount() { return LAYOUTS.length; }
  function getArenaSize() {
    return LAYOUTS[currentLayout]?.arenaSize || FPSConfig.ARENA_SIZE;
  }

  function getCeilingHeight() {
    const layout = LAYOUTS[currentLayout];
    if (layout?.noCeiling) return Infinity;
    return layout?.wallHeight || FPSConfig.WALL_HEIGHT;
  }

  return { build, damageAt, destroyCrate, resetDestroyed, getColliders, getLayoutIndex, getLayoutCount, getArenaSize, getCeilingHeight };
})();
