const rooms = new Map();

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 5;

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function create(hostSocketId, password) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  const room = {
    code,
    password: password || null,
    host: hostSocketId,
    players: [{ id: hostSocketId, color: 'white' }],
    state: 'waiting',
    chess: null,
    pendingMove: null,
    duelInfo: null,
    duelResolved: false,
    capturedPieces: { white: [], black: [] },
  };

  rooms.set(code, room);
  return room;
}

function join(code, socketId, password) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 2) return { error: 'Room is full' };
  if (room.password && room.password !== password) return { error: 'Wrong password' };
  if (room.state !== 'waiting') return { error: 'Game already in progress' };

  room.players.push({ id: socketId, color: 'black' });
  return { room };
}

function getByCode(code) {
  return rooms.get(code);
}

function getByPlayer(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === socketId)) return room;
  }
  return null;
}

function removePlayer(socketId) {
  const room = getByPlayer(socketId);
  if (!room) return null;

  room.players = room.players.filter(p => p.id !== socketId);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    return { room, empty: true };
  }

  if (room.host === socketId) {
    room.host = room.players[0].id;
  }

  return { room, empty: false };
}

module.exports = { create, join, getByCode, getByPlayer, removePlayer };
