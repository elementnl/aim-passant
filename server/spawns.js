const ARENA_HALF = 18;
const MIN_SPAWN_DISTANCE = 15;
const PLAYER_RADIUS = 0.5;

const OBSTACLES = [
  { pos: [0, 2, 0],       size: [4, 4, 1.5] },
  { pos: [0, 1, 6],       size: [2, 2, 2] },
  { pos: [0, 1, -6],      size: [2, 2, 2] },
  { pos: [-8, 1.5, 8],    size: [3, 3, 1] },
  { pos: [-8, 1.5, -8],   size: [1, 3, 3] },
  { pos: [8, 1.5, -8],    size: [3, 3, 1] },
  { pos: [8, 1.5, 8],     size: [1, 3, 3] },
  { pos: [-14, 1, 0],     size: [2, 2, 6] },
  { pos: [14, 1, 0],      size: [2, 2, 6] },
  { pos: [-5, 0.75, 3],   size: [1.5, 1.5, 1.5] },
  { pos: [5, 0.75, -3],   size: [1.5, 1.5, 1.5] },
  { pos: [-5, 0.75, -3],  size: [1.5, 1.5, 1.5] },
  { pos: [5, 0.75, 3],    size: [1.5, 1.5, 1.5] },
  { pos: [-12, 1, 14],    size: [4, 2, 1.5] },
  { pos: [12, 1, -14],    size: [4, 2, 1.5] },
  { pos: [-12, 1, -14],   size: [1.5, 2, 4] },
  { pos: [12, 1, 14],     size: [1.5, 2, 4] },
  { pos: [0, 1.5, 14],    size: [6, 3, 0.8] },
  { pos: [0, 1.5, -14],   size: [6, 3, 0.8] },
  { pos: [-16, 0.75, 6],  size: [1.5, 1.5, 1.5] },
  { pos: [16, 0.75, -6],  size: [1.5, 1.5, 1.5] },
  { pos: [-3, 2.5, 0],    size: [0.8, 5, 0.8] },
  { pos: [3, 2.5, 0],     size: [0.8, 5, 0.8] },
];

function collidesWithObstacle(x, z) {
  for (const { pos, size } of OBSTACLES) {
    const pad = PLAYER_RADIUS;
    if (x > pos[0] - size[0] / 2 - pad && x < pos[0] + size[0] / 2 + pad &&
        z > pos[2] - size[2] / 2 - pad && z < pos[2] + size[2] / 2 + pad) {
      return true;
    }
  }
  return false;
}

function randomPos() {
  return (Math.random() - 0.5) * 2 * ARENA_HALF;
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

function generateSpawns() {
  let attackerSpawn, defenderSpawn;
  let attempts = 0;

  do {
    attackerSpawn = { x: randomPos(), z: randomPos() };
    defenderSpawn = { x: randomPos(), z: randomPos() };
    attempts++;
    if (attempts > 200) {
      attackerSpawn = { x: -14, z: 0 };
      defenderSpawn = { x: 14, z: 0 };
      break;
    }
  } while (
    collidesWithObstacle(attackerSpawn.x, attackerSpawn.z) ||
    collidesWithObstacle(defenderSpawn.x, defenderSpawn.z) ||
    distance(attackerSpawn, defenderSpawn) < MIN_SPAWN_DISTANCE
  );

  const attackerYaw = Math.atan2(defenderSpawn.x - attackerSpawn.x, defenderSpawn.z - attackerSpawn.z);
  const defenderYaw = Math.atan2(attackerSpawn.x - defenderSpawn.x, attackerSpawn.z - defenderSpawn.z);

  return {
    attacker: { x: attackerSpawn.x, z: attackerSpawn.z, yaw: attackerYaw },
    defender: { x: defenderSpawn.x, z: defenderSpawn.z, yaw: defenderYaw },
  };
}

module.exports = { generateSpawns };
