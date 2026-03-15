const FPSRenderer = (() => {
  let scene, camera, renderer;

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x222222);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x222222, 30, 50);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
    scene.add(camera);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 0.6);
    sun.position.set(5, 20, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    scene.add(sun);

    const warmLight = new THREE.PointLight(0xffaa44, 0.4, 30);
    warmLight.position.set(-10, 5, -10);
    scene.add(warmLight);

    const coolLight = new THREE.PointLight(0x4488ff, 0.3, 30);
    coolLight.position.set(10, 5, 10);
    scene.add(coolLight);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function render() {
    renderer.render(scene, camera);
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }

  return { init, render, getScene, getCamera };
})();
