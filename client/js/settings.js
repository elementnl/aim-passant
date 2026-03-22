const Settings = (() => {
  const DEFAULTS = {
    shadows: true,
    antialiasing: true,
    textures: true,
    particles: true,
    renderScale: 1.0,
    masterVolume: 1.0,
    musicVolume: 1.0,
    sfxVolume: 1.0,
    sensitivity: 1.0,
    scopedSensitivity: 0.4,
  };
  let current = { ...DEFAULTS };

  function get(key) { return current[key]; }

  function set(key, value) {
    current[key] = value;
  }

  function setAll(obj) {
    current = { ...DEFAULTS, ...obj };
  }

  function reset() {
    current = { ...DEFAULTS };
  }

  function getAll() { return { ...current }; }

  return { get, set, setAll, reset, getAll, DEFAULTS };
})();
