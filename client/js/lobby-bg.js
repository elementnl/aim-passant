const LobbyBG = (() => {
  let renderer, scene, camera;
  let active = false;
  let angle = 0;

  function init(canvasId) {
    const canvas = document.getElementById(canvasId || 'lobby-bg-canvas');
    if (!canvas) return;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x1a1815);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1815, 18, 40);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 60);

    const ambient = new THREE.AmbientLight(0xffeedd, 0.35);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 0.5);
    sun.position.set(5, 15, 10);
    scene.add(sun);

    const warm1 = new THREE.PointLight(0xffeedd, 0.3, 12);
    warm1.position.set(-5, 8, -5);
    scene.add(warm1);

    const warm2 = new THREE.PointLight(0xffeedd, 0.3, 12);
    warm2.position.set(5, 8, 5);
    scene.add(warm2);

    buildScene();

    window.addEventListener('resize', () => {
      if (!renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    active = true;
    animate();
  }

  function buildScene() {
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5e });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const floorAccent = new THREE.MeshLambertMaterial({ color: 0x4a4a4e });
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if ((x + z) % 2 === 0) continue;
        const tile = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.01, 3.9), floorAccent);
        tile.position.set(x * 4, 0.003, z * 4);
        scene.add(tile);
      }
    }

    const lineMat = new THREE.MeshLambertMaterial({ color: 0x6a6a44 });
    for (let i = -2; i <= 2; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(16, 0.01, 0.12), lineMat);
      line.position.set(0, 0.005, i * 4);
      scene.add(line);
    }

    const wallMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });
    const wallTrimMat = new THREE.MeshLambertMaterial({ color: 0x3a3a42 });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x996633 });
    const concMat = new THREE.MeshLambertMaterial({ color: 0x606068 });
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a7040 });
    const crateTrimMat = new THREE.MeshLambertMaterial({ color: 0x6a5530 });
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x55555d });

    const half = 20;
    [
      { pos: [0, 5, -half], size: [40, 10, 0.5] },
      { pos: [0, 5, half],  size: [40, 10, 0.5] },
      { pos: [-half, 5, 0], size: [0.5, 10, 40] },
      { pos: [half, 5, 0],  size: [0.5, 10, 40] },
    ].forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
      mesh.position.set(...pos);
      scene.add(mesh);
    });

    [
      { pos: [0, 0.15, -half], size: [40, 0.3, 0.55] },
      { pos: [0, 0.15, half],  size: [40, 0.3, 0.55] },
      { pos: [-half, 0.15, 0], size: [0.55, 0.3, 40] },
      { pos: [half, 0.15, 0],  size: [0.55, 0.3, 40] },
    ].forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wallTrimMat);
      mesh.position.set(...pos);
      scene.add(mesh);
    });

    [
      { pos: [0, 1.2, -half], size: [40, 0.05, 0.52] },
      { pos: [0, 1.2, half],  size: [40, 0.05, 0.52] },
      { pos: [-half, 1.2, 0], size: [0.52, 0.05, 40] },
      { pos: [half, 1.2, 0],  size: [0.52, 0.05, 40] },
    ].forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), accentMat);
      mesh.position.set(...pos);
      scene.add(mesh);
    });

    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x3a3a40, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10;
    scene.add(ceiling);

    const covers = [
      { pos: [0, 2, 0],     size: [4, 4, 1.5],     mat: concMat, trim: true },
      { pos: [-8, 1.5, 8],  size: [3, 3, 1],        mat: concMat, trim: true },
      { pos: [8, 1.5, -8],  size: [3, 3, 1],        mat: concMat, trim: true },
      { pos: [-14, 1, 0],   size: [2, 2, 6],        mat: concMat, trim: true },
      { pos: [14, 1, 0],    size: [2, 2, 6],        mat: concMat, trim: true },
      { pos: [0, 1.5, 14],  size: [6, 3, 0.8],      mat: concMat, trim: true },
      { pos: [0, 1.5, -14], size: [6, 3, 0.8],      mat: concMat, trim: true },
    ];

    covers.forEach(({ pos, size, mat, trim }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      scene.add(mesh);
      if (trim) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.06, 0.08, size[2] + 0.06), wallTrimMat);
        cap.position.set(pos[0], pos[1] + size[1] / 2, pos[2]);
        scene.add(cap);
      }
    });

    const crates = [
      { pos: [0, 1, 6],     size: [2, 2, 2] },
      { pos: [0, 1, -6],    size: [2, 2, 2] },
      { pos: [-5, 0.75, 3], size: [1.5, 1.5, 1.5] },
      { pos: [5, 0.75, -3], size: [1.5, 1.5, 1.5] },
    ];

    crates.forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), crateMat);
      mesh.position.set(...pos);
      scene.add(mesh);
      const band = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.02, 0.08, size[2] + 0.02), crateTrimMat);
      band.position.set(pos[0], pos[1] + size[1] * 0.25, pos[2]);
      scene.add(band);
    });

    const pillars = [
      { pos: [-3, 3, 0], size: [0.8, 6, 0.8] },
      { pos: [3, 3, 0],  size: [0.8, 6, 0.8] },
    ];

    pillars.forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), pillarMat);
      mesh.position.set(...pos);
      scene.add(mesh);
      const flange = new THREE.Mesh(new THREE.BoxGeometry(size[0] * 1.8, 0.15, size[2] * 1.8), pillarMat);
      flange.position.set(pos[0], pos[1] - size[1] / 2 + 0.08, pos[2]);
      scene.add(flange);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.02, 0.06, size[2] + 0.02), accentMat);
      stripe.position.set(pos[0], pos[1] - size[1] / 2 + 0.5, pos[2]);
      scene.add(stripe);
    });
  }

  function animate() {
    if (!active) return;
    requestAnimationFrame(animate);

    angle += 0.0008;
    const radius = 16;
    camera.position.set(
      Math.cos(angle) * radius,
      4.5 + Math.sin(angle * 0.4) * 1,
      Math.sin(angle) * radius
    );
    camera.lookAt(0, 1.5, 0);

    renderer.render(scene, camera);
  }

  function stop() {
    active = false;
  }

  return { init, stop };
})();
