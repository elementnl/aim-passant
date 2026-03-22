const Audio = (() => {
  const sounds = {};
  let masterVolume = 1.0;

  const SOUND_DEFS = {
    shoot:          { src: 'sounds/shoot.mp3',          volume: 0.4 },
    hitConfirm:     { src: 'sounds/hit-confirm.wav',    volume: 0.5 },
    headshot:       { src: 'sounds/headshot.wav',       volume: 0.6 },
    damage:         { src: 'sounds/damage.wav',         volume: 0.5 },
    countdownTick:  { src: 'sounds/countdown-tick.mp3', volume: 0.6 },
    countdownGo:    { src: 'sounds/countdown-go.mp3',   volume: 0.7 },
    duelWin:        { src: 'sounds/duel-win.wav',       volume: 0.6 },
    duelLoss:       { src: 'sounds/duel-loss.mp3',      volume: 0.6 },
    explosion:      { src: 'sounds/explosion.wav',      volume: 0.5 },
    chessMove:      { src: 'sounds/chess-move.mp3',     volume: 0.5 },
    reload:         { src: 'sounds/reload.mp3',         volume: 0.5 },
    emptyClick:     { src: 'sounds/empty-click.mp3',    volume: 0.4 },
    outOfAmmo:      { src: 'sounds/out-of-ammo.mp3',   volume: 0.5 },
    wallImpact:     { src: 'sounds/wall-impact.mp3',    volume: 0.3 },

    footstep1:      { src: 'sounds/footstep-1.wav',     volume: 0.25 },
    footstep2:      { src: 'sounds/footstep-2.wav',     volume: 0.25 },
    footstep3:      { src: 'sounds/footstep-3.wav',     volume: 0.25 },
    footstep4:      { src: 'sounds/footstep-4.wav',     volume: 0.25 },

    bowDraw:        { src: 'sounds/bow-draw.mp3',       volume: 0.5 },
    bowRelease:     { src: 'sounds/bow-release.wav',    volume: 0.5 },

    shotgunFire:    { src: 'sounds/shotgun-fire.wav',   volume: 0.5 },
    shotgunPump:    { src: 'sounds/shotgun-pump.mp3',   volume: 0.4 },
    shotgunShell:   { src: 'sounds/shotgun-shell.mp3',  volume: 0.4 },

    sniperFire:     { src: 'sounds/sniper-fire.wav',    volume: 0.5 },
    sniperBolt:     { src: 'sounds/sniper-bolt.wav',    volume: 0.4 },
    sniperScope:    { src: 'sounds/sniper-scope.mp3',   volume: 0.4 },
    sniperReload:   { src: 'sounds/sniper-reload.mp3',  volume: 0.5 },

    arFire:         { src: 'sounds/ar-fire.mp3',        volume: 0.4 },
    arReload:       { src: 'sounds/ar-reload.mp3',      volume: 0.5 },

    deagleFire:     { src: 'sounds/deagle-fire.mp3',    volume: 0.5 },
    deagleReload:   { src: 'sounds/deagle-reload.mp3',  volume: 0.5 },
    minigunSpinup:  { src: 'sounds/minigun-spinup.wav',  volume: 0.5 },
    minigunFire:    { src: 'sounds/minigun-fire.wav',    volume: 0.4 },
    minigunWinddown:{ src: 'sounds/minigun-winddown.wav', volume: 0.4 },
    minigunReload:  { src: 'sounds/minigun-reload.wav',  volume: 0.5 },
    duelStart:      { src: 'sounds/duel-start.mp3',     volume: 0.7 },
    uiClick:        { src: 'sounds/ui-click.mp3',      volume: 1 },

    pawnFlashbang:    { src: 'sounds/pawn-flashbang.wav',     volume: 0.6 },
    knightUltCharge:  { src: 'sounds/knight-ult-charge.mp3',  volume: 0.5 },
    knightUltShot:    { src: 'sounds/knight-ult-shot.wav',    volume: 0.5 },
    explosionRocket:  { src: 'sounds/explosion-rocket.wav',   volume: 0.6 },
    bishopResurrect:  { src: 'sounds/bishop-resurrect.mp3',   volume: 0.6 },
    bishopSpell:      { src: 'sounds/bishop-spell.mp3',       volume: 0.6 },
    rookCloak:        { src: 'sounds/rook-cloak.mp3',         volume: 0.5 },
    whoosh:           { src: 'sounds/whoosh.wav',             volume: 0.2 },
    wallhackPulse:    { src: 'sounds/wallhack-pulse.mp3',     volume: 0.3 },
    fireballLaunch:   { src: 'sounds/fireball-launch.mp3',    volume: 0.6 },
    fireballImpact:   { src: 'sounds/fireball-impact.mp3',    volume: 0.6 },
    forcefieldOn:     { src: 'sounds/forcefield-on.mp3',      volume: 0.25 },
    airstrikeCall:    { src: 'sounds/airstrike-call.wav',     volume: 0.6 },
    airstrikeBoom:    { src: 'sounds/airstrike-boom.mp3',     volume: 0.7 },
    ultReady:         { src: 'sounds/ult-ready.mp3',          volume: 0.6 },

    voicePawnUlt:     { src: 'sounds/voice-pawn-ult.wav',     volume: 0.7 },
    voiceKnightHorse: { src: 'sounds/voice-knight-horse.wav', volume: 0.6 },
    voiceKnightUlt:   { src: 'sounds/voice-knight-ult.wav',   volume: 0.7 },
    voiceBishopUlt:   { src: 'sounds/voice-bishop-ult.mp3',   volume: 0.7 },
    voiceRookUlt:     { src: 'sounds/voice-rook-ult.wav',     volume: 0.7 },
    voiceQueenUlt:    { src: 'sounds/voice-queen-ult.mp3',    volume: 0.7 },
    voiceKingUlt:     { src: 'sounds/voice-king-ult.mp3',     volume: 0.7 },
  };

  function preload() {
    for (const [name, def] of Object.entries(SOUND_DEFS)) {
      const audio = new window.Audio(def.src);
      audio.preload = 'auto';
      sounds[name] = { audio, baseVolume: def.volume };
    }
    masterVolume = Settings.get('masterVolume');
    if (masterVolume === undefined || masterVolume === null) masterVolume = 1.0;
  }

  const activeSounds = {};

  function play(name) {
    const entry = sounds[name];
    if (!entry) return;

    const sfx = Settings.get('sfxVolume');
    const sfxVol = (sfx === undefined || sfx === null) ? 1 : sfx;
    const clone = entry.audio.cloneNode();
    clone.volume = entry.baseVolume * sfxVol * masterVolume;
    clone.play().catch(() => {});
    activeSounds[name] = clone;
    return clone;
  }

  function stop(name) {
    if (activeSounds[name]) {
      activeSounds[name].pause();
      activeSounds[name].currentTime = 0;
      delete activeSounds[name];
    }
  }

  let currentMusic = null;

  const MUSIC_TRACKS = {
    battle: 'sounds/bg-music.mp3',
    playground: 'sounds/bg-music-playground.mp3',
    lobby: 'sounds/bg-music-lobby.mp3',
  };

  let currentMusicTrack = null;

  function getMusicVolume() {
    const raw = Settings.get('musicVolume');
    const base = (raw === undefined || raw === null) ? 1 : raw;
    const caps = { battle: 0.3, playground: 0.5, lobby: 1 };
    const cap = caps[currentMusicTrack] || 0.5;
    return base * cap * masterVolume;
  }

  function playMusic(track) {
    stopMusic();
    currentMusicTrack = track;
    const src = MUSIC_TRACKS[track] || MUSIC_TRACKS.battle;
    currentMusic = new window.Audio(src);
    currentMusic.loop = true;
    currentMusic.volume = getMusicVolume();
    currentMusic.play().catch(() => {});
  }

  function stopMusic() {
    if (currentMusic) {
      currentMusic.pause();
      currentMusic.currentTime = 0;
      currentMusic = null;
    }
    currentMusicTrack = null;
  }

  function updateMusicVolume() {
    if (currentMusic) {
      currentMusic.volume = getMusicVolume();
    }
  }

  function setMasterVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
  }

  function setVolume(name, vol) {
    if (sounds[name]) {
      sounds[name].baseVolume = Math.max(0, Math.min(1, vol));
    }
  }

  return { preload, play, stop, playMusic, stopMusic, updateMusicVolume, setMasterVolume, setVolume };
})();
