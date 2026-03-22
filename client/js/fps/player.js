const FPSPlayer = (() => {
  const position = new THREE.Vector3(0, FPSConfig.PLAYER_HEIGHT, 0);
  const velocity = new THREE.Vector3();
  const rotation = { yaw: 0, pitch: 0 };
  let onGround = true;
  let jumpSpeed = FPSConfig.JUMP_SPEED;
  let canDoubleJump = false;
  let doubleJumpUsed = false;
  let spaceWasDown = false;

  const PLAYER_RADIUS = 0.3;
  const FOOTSTEP_INTERVAL = 0.35;
  let footstepTimer = 0;
  let footstepIndex = 0;
  const FOOTSTEP_SOUNDS = ['footstep1', 'footstep2', 'footstep3', 'footstep4'];

  function spawn(spawnData) {
    position.set(spawnData.x, FPSConfig.PLAYER_HEIGHT, spawnData.z);
    rotation.yaw = spawnData.yaw;
    velocity.set(0, 0, 0);
    rotation.pitch = 0;
    onGround = true;
    doubleJumpUsed = false;
    spaceWasDown = true;
    footstepTimer = 0;
  }

  function setJumpSpeed(js) {
    jumpSpeed = js;
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
    const { GRAVITY, PLAYER_HEIGHT, MOUSE_SENSITIVITY, PITCH_LIMIT } = FPSConfig;
    const ARENA_SIZE = FPSArena.getArenaSize ? FPSArena.getArenaSize() : FPSConfig.ARENA_SIZE;

    const forward = new THREE.Vector3(-Math.sin(rotation.yaw), 0, -Math.cos(rotation.yaw));
    const right = new THREE.Vector3(Math.cos(rotation.yaw), 0, -Math.sin(rotation.yaw));

    const moveDir = new THREE.Vector3();
    if (FPSInput.isDown('w') || FPSInput.isDown('arrowup'))    moveDir.add(forward);
    if (FPSInput.isDown('s') || FPSInput.isDown('arrowdown'))  moveDir.sub(forward);
    if (FPSInput.isDown('d') || FPSInput.isDown('arrowright')) moveDir.add(right);
    if (FPSInput.isDown('a') || FPSInput.isDown('arrowleft'))  moveDir.sub(right);
    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) moveDir.normalize();

    velocity.x = moveDir.x * speed;
    velocity.z = moveDir.z * speed;

    const spaceDown = FPSInput.isDown(' ');
    const spacePressed = spaceDown && !spaceWasDown;

    if (spacePressed && onGround) {
      velocity.y = jumpSpeed;
      onGround = false;
      doubleJumpUsed = false;
    } else if (spacePressed && !onGround && canDoubleJump && !doubleJumpUsed) {
      velocity.y = jumpSpeed;
      doubleJumpUsed = true;
    }

    spaceWasDown = spaceDown;
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

    if (isMoving && onGround) {
      footstepTimer -= dt;
      if (footstepTimer <= 0) {
        footstepTimer = FOOTSTEP_INTERVAL;
        Audio.play(FOOTSTEP_SOUNDS[footstepIndex]);
        footstepIndex = (footstepIndex + 1) % FOOTSTEP_SOUNDS.length;
      }
    } else {
      footstepTimer = 0;
    }

    const mouse = FPSInput.consumeMouse();
    const baseSens = Settings.get('sensitivity') || 1;
    const scopedSens = Settings.get('scopedSensitivity') || 0.4;
    const sensMult = FPSGun.getIsADS() ? scopedSens : baseSens;
    rotation.yaw -= mouse.x * MOUSE_SENSITIVITY * sensMult;
    rotation.pitch -= mouse.y * MOUSE_SENSITIVITY * sensMult;
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

  function isOnGround() { return onGround; }

  function setDoubleJump(enabled) { canDoubleJump = enabled; }

  function forceJump() {
    velocity.y = jumpSpeed;
    onGround = false;
  }

  return { spawn, setJumpSpeed, setDoubleJump, update, applyToCamera, getState, isOnGround, forceJump, position, rotation };
})();
