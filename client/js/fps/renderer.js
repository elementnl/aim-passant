const FPSRenderer = (() => {
  let scene, camera, renderer;
  let warmLight, coolLight;

  function init(canvas) {
    const quality = Settings.get('graphics');

    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x222222);

    if (quality === 'low') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      renderer.shadowMap.enabled = false;
    } else if (quality === 'medium') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap;
    } else {
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap;
    }

    scene = new THREE.Scene();

    if (quality === 'low') {
      scene.fog = new THREE.Fog(0x222222, 20, 35);
    } else {
      scene.fog = new THREE.Fog(0x222222, 30, 50);
    }

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
    scene.add(camera);

    const ambient = new THREE.AmbientLight(0xffffff, quality === 'low' ? 0.6 : 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 0.6);
    sun.position.set(5, 20, 5);
    if (quality !== 'low') {
      sun.castShadow = true;
      const shadowSize = quality === 'high' ? 1024 : 512;
      sun.shadow.mapSize.width = shadowSize;
      sun.shadow.mapSize.height = shadowSize;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 50;
      sun.shadow.camera.left = -25;
      sun.shadow.camera.right = 25;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
    }
    scene.add(sun);

    if (quality !== 'low') {
      warmLight = new THREE.PointLight(0xffaa44, 0.4, 30);
      warmLight.position.set(-10, 5, -10);
      scene.add(warmLight);

      coolLight = new THREE.PointLight(0x4488ff, 0.3, 30);
      coolLight.position.set(10, 5, 10);
      scene.add(coolLight);
    }

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function render() {
    renderer.render(scene, camera);
  }

  function setFOV(fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }

  return { init, render, setFOV, getScene, getCamera };
})();
