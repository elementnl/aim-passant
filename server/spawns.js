const MIN_SPAWN_DISTANCE = 12;
const PLAYER_RADIUS = 0.8;

const ARENA_CONFIGS = [
  {
    half: 18,
    obstacles: [
      { pos: [0, 2, 0],       size: [4, 4, 1.5] },
      { pos: [0, 1, 6],       size: [2, 2, 2] },
      { pos: [0, 1, -6],      size: [2, 2, 2] },
      { pos: [-8, 1.5, 8],    size: [3, 3, 1] },
      { pos: [-8, 1.5, -8],   size: [1, 3, 3] },
      { pos: [8, 1.5, -8],    size: [3, 3, 1] },
      { pos: [8, 1.5, 8],     size: [1, 3, 3] },
      { pos: [-14, 1, 0],     size: [2, 2, 6] },
      { pos: [14, 1, 0],      size: [2, 2, 6] },
      { pos: [0, 1.5, 14],    size: [6, 3, 0.8] },
      { pos: [0, 1.5, -14],   size: [6, 3, 0.8] },
      { pos: [-3, 3, 0],      size: [0.8, 6, 0.8] },
      { pos: [3, 3, 0],       size: [0.8, 6, 0.8] },
    ],
  },
  {
    half: 11,
    obstacles: [
      { pos: [-5, 1.25, 0],   size: [0.5, 2.5, 8] },
      { pos: [5, 1.25, 0],    size: [0.5, 2.5, 8] },
      { pos: [0, 1.25, -5],   size: [4, 2.5, 0.5] },
      { pos: [0, 1.25, 5],    size: [4, 2.5, 0.5] },
      { pos: [0, 0.75, 0],    size: [1.5, 1.5, 1.5] },
      { pos: [-9, 1.25, 0],   size: [1.5, 2.5, 0.5] },
      { pos: [9, 1.25, 0],    size: [1.5, 2.5, 0.5] },
    ],
  },
  {
    half: 26,
    obstacles: [
      { pos: [0, 2, 0],       size: [3, 4, 3] },
      { pos: [-15, 1.5, 15],  size: [4, 3, 4] },
      { pos: [15, 1.5, -15],  size: [4, 3, 4] },
      { pos: [-8, 1, 0],      size: [2, 2, 2] },
      { pos: [8, 1, 0],       size: [2, 2, 2] },
      { pos: [0, 1, 10],      size: [2, 2, 2] },
      { pos: [0, 1, -10],     size: [2, 2, 2] },
      { pos: [-20, 1.5, 0],   size: [3, 3, 1] },
      { pos: [20, 1.5, 0],    size: [1, 3, 3] },
      { pos: [0, 1.5, 20],    size: [3, 3, 1] },
      { pos: [0, 1.5, -20],   size: [1, 3, 3] },
    ],
  },
  {
    half: 20,
    obstacles: [
      { pos: [-15, 3.5, -15], size: [0.8, 7, 0.8] },
      { pos: [-7, 3.5, -15],  size: [0.8, 7, 0.8] },
      { pos: [-15, 3.5, -7],  size: [0.8, 7, 0.8] },
      { pos: [-8, 1.5, -18],  size: [4, 3, 0.8] },
      { pos: [-18, 1.5, -10], size: [0.8, 3, 4] },
      { pos: [-12, 1.5, -12], size: [3, 3, 0.8] },
      { pos: [12, 1.5, 0],    size: [3, 3, 1] },
      { pos: [0, 1.5, 12],    size: [1, 3, 3] },
      { pos: [16, 2, -16],    size: [4, 4, 4] },
    ],
  },
];

function collidesWithObstacle(x, z, config) {
  for (const { pos, size } of config.obstacles) {
    const pad = PLAYER_RADIUS;
    if (x > pos[0] - size[0] / 2 - pad && x < pos[0] + size[0] / 2 + pad &&
        z > pos[2] - size[2] / 2 - pad && z < pos[2] + size[2] / 2 + pad) {
      return true;
    }
  }
  return false;
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

function generateSpawns(arenaIndex) {
  const config = ARENA_CONFIGS[arenaIndex] || ARENA_CONFIGS[0];
  const half = config.half;
  let attackerSpawn, defenderSpawn;
  let attempts = 0;

  do {
    attackerSpawn = { x: (Math.random() - 0.5) * 2 * half, z: (Math.random() - 0.5) * 2 * half };
    defenderSpawn = { x: (Math.random() - 0.5) * 2 * half, z: (Math.random() - 0.5) * 2 * half };
    attempts++;
    if (attempts > 500) {
      attackerSpawn = { x: -half + 2, z: 0 };
      defenderSpawn = { x: half - 2, z: 0 };
      break;
    }
  } while (
    collidesWithObstacle(attackerSpawn.x, attackerSpawn.z, config) ||
    collidesWithObstacle(defenderSpawn.x, defenderSpawn.z, config) ||
    distance(attackerSpawn, defenderSpawn) < MIN_SPAWN_DISTANCE
  );

  const attackerYaw = Math.atan2(defenderSpawn.x - attackerSpawn.x, defenderSpawn.z - attackerSpawn.z);
  const defenderYaw = Math.atan2(attackerSpawn.x - defenderSpawn.x, attackerSpawn.z - defenderSpawn.z);

  return {
    attacker: { x: attackerSpawn.x, z: attackerSpawn.z, yaw: attackerYaw },
    defender: { x: defenderSpawn.x, z: defenderSpawn.z, yaw: defenderYaw },
  };
}

function getArenaCount() { return ARENA_CONFIGS.length; }

module.exports = { generateSpawns, getArenaCount };
