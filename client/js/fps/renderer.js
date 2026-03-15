const FPSRenderer = (() => {
  let scene, camera, renderer;

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb);
    renderer.shadowMap.enabled = false;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 40, 80);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
    scene.add(camera);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    scene.add(sun);

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
