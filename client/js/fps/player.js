const FPSPlayer = (() => {
  const position = new THREE.Vector3(0, FPSConfig.PLAYER_HEIGHT, 0);
  const velocity = new THREE.Vector3();
  const rotation = { yaw: 0, pitch: 0 };
  let onGround = true;

  const PLAYER_RADIUS = 0.3;

  function spawn(spawnData) {
    position.set(spawnData.x, FPSConfig.PLAYER_HEIGHT, spawnData.z);
    rotation.yaw = spawnData.yaw;
    velocity.set(0, 0, 0);
    rotation.pitch = 0;
    onGround = true;
  }

  function collidesWithCover(x, y, z) {
    const colliders = FPSArena.getColliders();
    const feet = y - FPSConfig.PLAYER_HEIGHT;
    const head = y + 0.2;

    for (const c of colliders) {
      if (x + PLAYER_RADIUS > c.minX && x - PLAYER_RADIUS < c.maxX &&
          z + PLAYER_RADIUS > c.minZ && z - PLAYER_RADIUS < c.maxZ &&
          head > c.minY && feet < c.maxY) {
        return true;
      }
    }
    return false;
  }

  function getGroundHeight(x, z) {
    const colliders = FPSArena.getColliders();
    let highest = 0;

    for (const c of colliders) {
      if (x + PLAYER_RADIUS > c.minX && x - PLAYER_RADIUS < c.maxX &&
          z + PLAYER_RADIUS > c.minZ && z - PLAYER_RADIUS < c.maxZ) {
        if (c.maxY > highest) {
          highest = c.maxY;
        }
      }
    }
    return highest;
  }

  function update(dt, speed) {
    const { GRAVITY, JUMP_SPEED, ARENA_SIZE, PLAYER_HEIGHT, MOUSE_SENSITIVITY, PITCH_LIMIT } = FPSConfig;

    const forward = new THREE.Vector3(-Math.sin(rotation.yaw), 0, -Math.cos(rotation.yaw));
    const right = new THREE.Vector3(Math.cos(rotation.yaw), 0, -Math.sin(rotation.yaw));

    const moveDir = new THREE.Vector3();
    if (FPSInput.isDown('w') || FPSInput.isDown('arrowup'))    moveDir.add(forward);
    if (FPSInput.isDown('s') || FPSInput.isDown('arrowdown'))  moveDir.sub(forward);
    if (FPSInput.isDown('d') || FPSInput.isDown('arrowright')) moveDir.add(right);
    if (FPSInput.isDown('a') || FPSInput.isDown('arrowleft'))  moveDir.sub(right);
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    velocity.x = moveDir.x * speed;
    velocity.z = moveDir.z * speed;

    if (FPSInput.isDown(' ') && onGround) {
      velocity.y = JUMP_SPEED;
      onGround = false;
    }
    velocity.y += GRAVITY * dt;

    const half = ARENA_SIZE / 2 - 0.5;

    let newX = position.x + velocity.x * dt;
    newX = Math.max(-half, Math.min(half, newX));
    if (!collidesWithCover(newX, position.y, position.z)) {
      position.x = newX;
    }

    let newZ = position.z + velocity.z * dt;
    newZ = Math.max(-half, Math.min(half, newZ));
    if (!collidesWithCover(position.x, position.y, newZ)) {
      position.z = newZ;
    }

    let newY = position.y + velocity.y * dt;
    const groundHeight = getGroundHeight(position.x, position.z);
    const minY = groundHeight + PLAYER_HEIGHT;

    if (newY <= minY) {
      newY = minY;
      velocity.y = 0;
      onGround = true;
    }

    if (!collidesWithCover(position.x, newY, position.z)) {
      position.y = newY;
    } else {
      if (velocity.y > 0) {
        velocity.y = 0;
      } else {
        onGround = true;
        velocity.y = 0;
      }
    }

    const mouse = FPSInput.consumeMouse();
    rotation.yaw -= mouse.x * MOUSE_SENSITIVITY;
    rotation.pitch -= mouse.y * MOUSE_SENSITIVITY;
    rotation.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rotation.pitch));
  }

  function applyToCamera(camera) {
    camera.position.copy(position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = rotation.yaw;
    camera.rotation.x = rotation.pitch;
  }

  function getState() {
    return {
      x: position.x, y: position.y, z: position.z,
      yaw: rotation.yaw, pitch: rotation.pitch,
    };
  }

  return { spawn, update, applyToCamera, getState, position, rotation };
})();
