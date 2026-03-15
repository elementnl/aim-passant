const Audio = (() => {
  const sounds = {};
  let masterVolume = 1.0;

  const SOUND_DEFS = {
    shoot:         { src: 'sounds/shoot.mp3',         volume: 0.4 },
    hitConfirm:    { src: 'sounds/hit-confirm.wav',   volume: 0.5 },
    damage:        { src: 'sounds/damage.wav',        volume: 0.5 },
    countdownTick: { src: 'sounds/countdown-tick.mp3', volume: 0.6 },
    countdownGo:   { src: 'sounds/countdown-go.mp3',  volume: 0.7 },
    duelWin:       { src: 'sounds/duel-win.wav',      volume: 0.6 },
    duelLoss:      { src: 'sounds/duel-loss.mp3',     volume: 0.6 },
    explosion:     { src: 'sounds/explosion.wav',     volume: 0.5 },
    chessMove:     { src: 'sounds/chess-move.mp3',    volume: 0.5 },
    reload:        { src: 'sounds/reload.mp3',       volume: 0.5 },
    emptyClick:    { src: 'sounds/empty-click.mp3',  volume: 0.4 },
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
