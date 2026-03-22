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
    renderer.setClearColor(0x151518);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x151518, 20, 45);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 60);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 0.7);
    sun.position.set(5, 15, 10);
    scene.add(sun);

    const blue = new THREE.PointLight(0x4488ff, 0.8, 35);
    blue.position.set(-8, 4, -8);
    scene.add(blue);

    const warm = new THREE.PointLight(0xff8844, 0.6, 30);
    warm.position.set(10, 3, 5);
    scene.add(warm);

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
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallMat = new THREE.MeshLambertMaterial({ color: 0x3a3a40 });
    const coverMat = new THREE.MeshLambertMaterial({ color: 0x44444a });
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x5a4a38 });
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x4a4a50 });

    const covers = [
      { pos: [0, 2, 0],     size: [4, 4, 1.5], mat: wallMat },
      { pos: [-8, 1.5, 8],  size: [3, 3, 1],   mat: wallMat },
      { pos: [8, 1.5, -8],  size: [3, 3, 1],   mat: wallMat },
      { pos: [-14, 1, 0],   size: [2, 2, 6],   mat: wallMat },
      { pos: [14, 1, 0],    size: [2, 2, 6],   mat: wallMat },
      { pos: [0, 1, 6],     size: [2, 2, 2],   mat: crateMat },
      { pos: [0, 1, -6],    size: [2, 2, 2],   mat: crateMat },
      { pos: [-5, 0.75, 3], size: [1.5, 1.5, 1.5], mat: crateMat },
      { pos: [5, 0.75, -3], size: [1.5, 1.5, 1.5], mat: crateMat },
      { pos: [-3, 2.5, 0],  size: [0.8, 5, 0.8], mat: pillarMat },
      { pos: [3, 2.5, 0],   size: [0.8, 5, 0.8], mat: pillarMat },
      { pos: [0, 1.5, 14],  size: [6, 3, 0.8], mat: wallMat },
      { pos: [0, 1.5, -14], size: [6, 3, 0.8], mat: wallMat },
      { pos: [-12, 1, 14],  size: [4, 2, 1.5], mat: coverMat },
      { pos: [12, 1, -14],  size: [4, 2, 1.5], mat: coverMat },
    ];

    covers.forEach(({ pos, size, mat }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      scene.add(mesh);
    });

    const half = 20;
    const borderMat = new THREE.MeshLambertMaterial({ color: 0x333338 });
    [
      { pos: [0, 3, -half], size: [40, 6, 0.5] },
      { pos: [0, 3, half],  size: [40, 6, 0.5] },
      { pos: [-half, 3, 0], size: [0.5, 6, 40] },
      { pos: [half, 3, 0],  size: [0.5, 6, 40] },
    ].forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), borderMat);
      mesh.position.set(...pos);
      scene.add(mesh);
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
