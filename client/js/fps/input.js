const FPSInput = (() => {
  const keys = {};
  const mouse = { x: 0, y: 0 };
  let canvas = null;

  function bind(targetCanvas) {
    canvas = targetCanvas;
    document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        mouse.x += e.movementX;
        mouse.y += e.movementY;
      }
    });
  }

  function requestPointerLock() {
    if (canvas) canvas.requestPointerLock();
  }

  function releasePointerLock() {
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }

  function isPointerLocked() {
    return document.pointerLockElement === canvas;
  }

  function consumeMouse() {
    const result = { x: mouse.x, y: mouse.y };
    mouse.x = 0;
    mouse.y = 0;
    return result;
  }

  function isDown(key) {
    return !!keys[key];
  }

  function clearAll() {
    Object.keys(keys).forEach(k => { keys[k] = false; });
    mouse.x = 0;
    mouse.y = 0;
  }

  return { bind, requestPointerLock, releasePointerLock, isPointerLocked, consumeMouse, isDown, clearAll };
})();
