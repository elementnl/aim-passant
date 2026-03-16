const Settings = (() => {
  const DEFAULTS = { graphics: 'high' };
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

  load();

  return { get, set };
})();
