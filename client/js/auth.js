const Auth = (() => {
  let supabase = null;
  let currentUser = null;
  let userProfile = null;

  async function init() {
    const res = await fetch('/api/config');
    const config = await res.json();
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      return true;
    }
    return false;
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    currentUser = data.user;
    await loadProfile();
    await loadSettings();
    return currentUser;
  }

  async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    userProfile = null;
    Settings.reset();
  }

  async function loadProfile() {
    if (!currentUser) return;
    const { data } = await supabase
      .from('aim_passant_users')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    userProfile = data;
  }

  async function loadSettings() {
    if (!currentUser) return;
    const { data } = await supabase
      .from('aim_passant_settings')
      .select('settings_json')
      .eq('user_id', currentUser.id)
      .single();
    if (data && data.settings_json) {
      Settings.setAll(data.settings_json);
    }
  }

  let saveTimeout = null;

  async function saveSettings() {
    if (!currentUser) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const all = Settings.getAll();
      const { data: existing } = await supabase
        .from('aim_passant_settings')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .single();

      if (existing) {
        await supabase
          .from('aim_passant_settings')
          .update({ settings_json: all, updated_at: new Date().toISOString() })
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('aim_passant_settings')
          .insert({ user_id: currentUser.id, settings_json: all });
      }
    }, 2000);
  }

  async function searchUsers(query) {
    if (!query || query.length < 2) return [];
    const { data } = await supabase
      .from('aim_passant_users')
      .select('id, username')
      .ilike('username', `%${query}%`)
      .neq('id', currentUser.id)
      .limit(10);
    return data || [];
  }

  async function addFriend(friendId) {
    const { error } = await supabase
      .from('aim_passant_friendships')
      .insert({ user_id: currentUser.id, friend_id: friendId });
    if (error) throw new Error(error.message);
  }

  async function removeFriend(friendId) {
    await supabase
      .from('aim_passant_friendships')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('friend_id', friendId);
  }

  async function getFriends() {
    if (!currentUser) return [];
    const { data } = await supabase
      .from('aim_passant_friendships')
      .select('friend_id, aim_passant_users!aim_passant_friendships_friend_id_fkey(username)')
      .eq('user_id', currentUser.id);

    if (!data) return [];
    return data.map(row => ({
      id: row.friend_id,
      username: row.aim_passant_users?.username || 'Unknown',
    }));
  }

  function getUser() { return currentUser; }
  function getProfile() { return userProfile; }
  function isLoggedIn() { return !!currentUser; }
  function getUsername() { return userProfile?.username || 'Player'; }
  function getClient() { return supabase; }

  return {
    init, login, logout, loadSettings, saveSettings,
    searchUsers, addFriend, removeFriend, getFriends,
    getUser, getProfile, isLoggedIn, getUsername, getClient,
  };
})();
