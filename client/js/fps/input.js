const FPSInput = (() => {
  const keys = {};
  const mouse = { x: 0, y: 0 };
  let canvas = null;
  let lockTime = 0;
  const LOCK_GRACE_MS = 50;

  function bind(targetCanvas) {
    canvas = targetCanvas;
    document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      if (performance.now() - lockTime < LOCK_GRACE_MS) return;
      mouse.x += e.movementX;
      mouse.y += e.movementY;
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === canvas) {
        lockTime = performance.now();
      }
      mouse.x = 0;
      mouse.y = 0;
    });
  }

  function requestPointerLock() {
    if (!canvas || document.pointerLockElement === canvas) return;
    try {
      canvas.requestPointerLock({ unadjustedMovement: true });
    } catch {
      canvas.requestPointerLock();
    }
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
