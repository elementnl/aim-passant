const rooms = new Map();

function normalize(name) {
  return name.trim().toLowerCase();
}

function create(hostSocketId, name, password) {
  const key = normalize(name);
  if (!key) return { error: 'Room name is required' };
  if (key.length > 30) return { error: 'Room name too long' };
  if (rooms.has(key)) return { error: 'Room name already taken' };

  const room = {
    name: name.trim(),
    key,
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

  rooms.set(key, room);
  return { room };
}

function join(name, socketId, password) {
  const key = normalize(name);
  const room = rooms.get(key);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 2) return { error: 'Room is full' };
  if (room.password && room.password !== password) return { error: 'Wrong password' };
  if (room.state !== 'waiting') return { error: 'Game already in progress' };

  room.players.push({ id: socketId, color: 'black' });
  return { room };
}

function getByName(name) {
  return rooms.get(normalize(name));
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
    rooms.delete(room.key);
    return { room, empty: true };
  }

  if (room.host === socketId) {
    room.host = room.players[0].id;
  }

  return { room, empty: false };
}

module.exports = { create, join, getByName, getByPlayer, removePlayer };
