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
    duelStart:      { src: 'sounds/duel-start.mp3',    volume: 0.7 },
  };

  function preload() {
    for (const [name, def] of Object.entries(SOUND_DEFS)) {
      const audio = new window.Audio(def.src);
      audio.preload = 'auto';
      sounds[name] = { audio, baseVolume: def.volume };
    }
  }

  function play(name) {
    const entry = sounds[name];
    if (!entry) return;

    const clone = entry.audio.cloneNode();
    clone.volume = entry.baseVolume * masterVolume;
    clone.play().catch(() => {});
  }

  function setMasterVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
  }

  function setVolume(name, vol) {
    if (sounds[name]) {
      sounds[name].baseVolume = Math.max(0, Math.min(1, vol));
    }
  }

  return { preload, play, setMasterVolume, setVolume };
})();
