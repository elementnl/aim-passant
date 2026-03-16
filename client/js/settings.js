const Settings = (() => {
  const DEFAULTS = {
    graphics: 'high',
    masterVolume: 1.0,
    musicVolume: 0.1,
    sfxVolume: 1.0,
    sensitivity: 1.0,
    scopedSensitivity: 0.4,
  };
  let current = { ...DEFAULTS };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('aim-passant-settings'));
      if (saved) current = { ...DEFAULTS, ...saved };
    } catch {}
  }

  function save() {
    localStorage.setItem('aim-passant-settings', JSON.stringify(current));
  }

  function get(key) { return current[key]; }

  function set(key, value) {
    current[key] = value;
    save();
  }

  function getAll() { return { ...current }; }

  load();

  return { get, set, getAll, DEFAULTS };
})();
