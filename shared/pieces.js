const PIECE_STATS = {
  p: { hp: 50,  speed: 5,  damage: 8,   fireRate: 400, name: 'Pawn' },
  n: { hp: 100, speed: 7,  damage: 12,  fireRate: 350, name: 'Knight' },
  b: { hp: 100, speed: 6,  damage: 14,  fireRate: 300, name: 'Bishop' },
  r: { hp: 150, speed: 4,  damage: 20,  fireRate: 500, name: 'Rook' },
  q: { hp: 200, speed: 6,  damage: 18,  fireRate: 200, name: 'Queen' },
  k: { hp: 120, speed: 5,  damage: 15,  fireRate: 300, name: 'King' },
};

if (typeof module !== 'undefined') {
  module.exports = { PIECE_STATS };
}
