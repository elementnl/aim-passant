const ARENA_HALF = 18;
const MIN_SPAWN_DISTANCE = 15;
const PLAYER_RADIUS = 0.8;

const ARENA_OBSTACLES = [
  // 0: Warehouse
  [
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
    { pos: [0, 1.5, 14],    size: [6, 3, 0.8] },
    { pos: [0, 1.5, -14],   size: [6, 3, 0.8] },
    { pos: [-3, 2.5, 0],    size: [0.8, 5, 0.8] },
    { pos: [3, 2.5, 0],     size: [0.8, 5, 0.8] },
  ],
  // 1: Corridors
  [
    { pos: [-7, 2, -12],   size: [0.8, 4, 14] },
    { pos: [-7, 2, 12],    size: [0.8, 4, 14] },
    { pos: [7, 2, -12],    size: [0.8, 4, 14] },
    { pos: [7, 2, 12],     size: [0.8, 4, 14] },
    { pos: [-4, 2, -10],   size: [5, 4, 0.8] },
    { pos: [4, 2, -10],    size: [5, 4, 0.8] },
    { pos: [-4, 2, 10],    size: [5, 4, 0.8] },
    { pos: [4, 2, 10],     size: [5, 4, 0.8] },
    { pos: [-3.5, 1, 5],   size: [6, 2, 0.8] },
    { pos: [3.5, 1, -5],   size: [6, 2, 0.8] },
    { pos: [-12, 1, 5],    size: [1.5, 2, 1.5] },
    { pos: [12, 1, -5],    size: [1.5, 2, 1.5] },
    { pos: [-12, 1, -5],   size: [1.5, 2, 1.5] },
    { pos: [12, 1, 5],     size: [1.5, 2, 1.5] },
    { pos: [0, 1, 0],      size: [2, 2, 2] },
    { pos: [-14, 1.5, 0],  size: [6, 3, 0.8] },
    { pos: [14, 1.5, 0],   size: [6, 3, 0.8] },
    { pos: [-3.5, 0.75, -14], size: [1.5, 1.5, 1.5] },
    { pos: [3.5, 0.75, 14],   size: [1.5, 1.5, 1.5] },
    { pos: [0, 1, 15],     size: [4, 2, 1.5] },
    { pos: [0, 1, -15],    size: [4, 2, 1.5] },
  ],
  // 2: Towers
  [
    { pos: [-10, 1.5, -10], size: [4, 3, 4] },
    { pos: [-10, 0.15, -7], size: [4, 0.3, 2] },
    { pos: [10, 1.5, 10],   size: [4, 3, 4] },
    { pos: [10, 0.15, 13],  size: [4, 0.3, 2] },
    { pos: [0, 2.5, 0],     size: [3, 5, 3] },
    { pos: [-5, 1, 5],      size: [2, 2, 2] },
    { pos: [5, 1, -5],      size: [2, 2, 2] },
    { pos: [-14, 1, 0],     size: [2, 2, 2] },
    { pos: [14, 1, 0],      size: [2, 2, 2] },
    { pos: [-5, 0.5, -12],  size: [6, 1, 0.8] },
    { pos: [5, 0.5, 12],    size: [6, 1, 0.8] },
    { pos: [0, 1.5, 8],     size: [3, 3, 0.8] },
    { pos: [0, 1.5, -8],    size: [3, 3, 0.8] },
    { pos: [-16, 1, 10],    size: [1.5, 2, 1.5] },
    { pos: [16, 1, -10],    size: [1.5, 2, 1.5] },
  ],
  // 3: Sniper Alley
  [
    { pos: [0, 2, -14],     size: [1, 4, 10] },
    { pos: [0, 2, 14],      size: [1, 4, 10] },
    { pos: [0, 2, 0],       size: [1, 4, 8] },
    { pos: [-10, 1, 0],     size: [2, 2, 2] },
    { pos: [10, 1, 0],      size: [2, 2, 2] },
    { pos: [-5, 0.75, 10],  size: [1.5, 1.5, 1.5] },
    { pos: [5, 0.75, -10],  size: [1.5, 1.5, 1.5] },
    { pos: [-5, 0.75, -10], size: [1.5, 1.5, 1.5] },
    { pos: [5, 0.75, 10],   size: [1.5, 1.5, 1.5] },
    { pos: [-15, 1.5, 10],  size: [3, 3, 1] },
    { pos: [15, 1.5, -10],  size: [3, 3, 1] },
    { pos: [-15, 1.5, -10], size: [1, 3, 3] },
    { pos: [15, 1.5, 10],   size: [1, 3, 3] },
    { pos: [-8, 1.5, 0],    size: [0.8, 3, 8] },
    { pos: [8, 1.5, 0],     size: [0.8, 3, 8] },
    { pos: [0, 1, 16],      size: [6, 2, 1.5] },
    { pos: [0, 1, -16],     size: [6, 2, 1.5] },
    { pos: [-12, 2, -5],    size: [4, 4, 4] },
    { pos: [-12, 0.15, -2], size: [4, 0.3, 2] },
    { pos: [12, 2, 5],      size: [4, 4, 4] },
    { pos: [12, 0.15, 8],   size: [4, 0.3, 2] },
  ],
];

function collidesWithObstacle(x, z, obstacles) {
  for (const { pos, size } of obstacles) {
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

function generateSpawns(arenaIndex) {
  const obstacles = ARENA_OBSTACLES[arenaIndex] || ARENA_OBSTACLES[0];
  let attackerSpawn, defenderSpawn;
  let attempts = 0;

  do {
    attackerSpawn = { x: randomPos(), z: randomPos() };
    defenderSpawn = { x: randomPos(), z: randomPos() };
    attempts++;
    if (attempts > 500) {
      attackerSpawn = { x: -16, z: 0 };
      defenderSpawn = { x: 16, z: 0 };
      break;
    }
  } while (
    collidesWithObstacle(attackerSpawn.x, attackerSpawn.z, obstacles) ||
    collidesWithObstacle(defenderSpawn.x, defenderSpawn.z, obstacles) ||
    distance(attackerSpawn, defenderSpawn) < MIN_SPAWN_DISTANCE
  );

  const attackerYaw = Math.atan2(defenderSpawn.x - attackerSpawn.x, defenderSpawn.z - attackerSpawn.z);
  const defenderYaw = Math.atan2(attackerSpawn.x - defenderSpawn.x, attackerSpawn.z - defenderSpawn.z);

  return {
    attacker: { x: attackerSpawn.x, z: attackerSpawn.z, yaw: attackerYaw },
    defender: { x: defenderSpawn.x, z: defenderSpawn.z, yaw: defenderYaw },
  };
}

function getArenaCount() { return ARENA_OBSTACLES.length; }

module.exports = { generateSpawns, getArenaCount };
