const SUPABASE_URL = 'https://ogwhtfrmsyneojqtiemp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Bbt2M-26ya-1CE4DqZDgFg_wf7Gc6gq';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const DEBUG_AUTH = true;
const AUTH_EMAIL_DOMAIN = 'gmail.com';

const state = {
  data: null,
  session: null,
  profile: null,
  profileStatus: 'loading',
  profileFetchErrorMessage: '',
  pendingMatches: [],
  postMatchEditor: { open: false, matchId: null, playerStatsDraft: {} },
  selectedMatchId: null,
  convocatoria: {
    matchId: null,
    attendanceByUserId: {},
    profileIdByPlayerId: {},
    lastSaveResult: '-'
  },
  mvp: {
    selectedMatchId: null,
    votesByPlayerForSelected: {},
    globalTotals: {},
    lastVotePayload: '-'
  },
  lineupsByMatch: {},
  lineupEditor: {
    selectedMatchId: null,
    formation: '1-2-3-1',
    selectedSlot: 'GK',
    assignments: {},
    originalAssignments: {}
  }
};

const FORMATIONS = {
  '1-2-3-1': {
    slots: ['GK', 'D1', 'D2', 'M1', 'M2', 'M3', 'F1'],
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 35, y: 68 },
      D2: { x: 65, y: 68 },
      M1: { x: 25, y: 45 },
      M2: { x: 50, y: 42 },
      M3: { x: 75, y: 45 },
      F1: { x: 50, y: 18 }
    }
  },
  '1-3-2-1': {
    slots: ['GK', 'D1', 'D2', 'D3', 'M1', 'M2', 'F1'],
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 25, y: 68 },
      D2: { x: 50, y: 64 },
      D3: { x: 75, y: 68 },
      M1: { x: 38, y: 42 },
      M2: { x: 62, y: 42 },
      F1: { x: 50, y: 18 }
    }
  }
};

const $ = (id) => document.getElementById(id);

function mapPlayerRow(row) {
  const stats = row.stats || {};
  return {
    id: String(row.id),
    name: row.name || row.display_name || 'Jugador',
    position: row.position || 'N/D',
    dorsal: Number(row.number ?? row.dorsal ?? 0),
    stats: {
      goles: Number(row.goles ?? row.goals ?? stats.goles ?? stats.goals ?? 0),
      asistencias: Number(row.asistencias ?? row.assists ?? stats.asistencias ?? stats.assists ?? 0),
      amarillas: Number(row.amarillas ?? row.yellow_cards ?? stats.amarillas ?? stats.yellow_cards ?? 0),
      rojas: Number(row.rojas ?? row.red_cards ?? stats.rojas ?? stats.red_cards ?? 0),
      mvps: Number(row.mvps ?? stats.mvps ?? 0)
    }
  };
}

function mapMatchRow(row) {
  const hasNumericResult = row.result_home !== null && row.result_home !== undefined && row.result_away !== null && row.result_away !== undefined;
  const result = hasNumericResult ? `${row.result_home}-${row.result_away}` : (row.result || '-');
  return {
    id: String(row.id),
    date: row.date_time || row.date,
    rival: row.rival || row.opponent || 'Rival',
    home: row.home ?? row.is_home ?? true,
    venue: row.venue || 'Velòdrom F7',
    result,
    result_home: row.result_home,
    result_away: row.result_away
  };
}


function normalizeAttendanceStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'yes') return 'yes';
  if (value === 'maybe') return 'maybe';
  if (value === 'no') return 'no';
  if (value === 'pending') return 'pending';
  return 'pending';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function getConvocatoriaStatusForPlayer(playerId) {
  const userId = state.convocatoria.profileIdByPlayerId[playerId];
  if (!userId) return 'pending';
  return normalizeAttendanceStatus(state.convocatoria.attendanceByUserId[userId]);
}

async function loadConvocatoriaData(matchId) {
  state.convocatoria.matchId = matchId;
  state.convocatoria.attendanceByUserId = {};
  state.convocatoria.profileIdByPlayerId = {};

  if (!supabaseClient || !matchId) return;

  if (!isUuid(matchId)) {
    const error = { message: 'matchId no es UUID de Supabase', code: 'BAD_MATCH_ID', matchId };
    console.error('[attendance] load error', error);
    state.convocatoria.lastSaveResult = JSON.stringify({ ok: false, ...error });
    return;
  }

  const { data: profiles, error: profilesError } = await supabaseClient
    .from('profiles')
    .select('id, display_name, role, player_id');

  if (profilesError) {
    console.error('[attendance] profiles load error', profilesError);
    showToast('Error cargando perfiles: ' + (profilesError.message || profilesError.code), 'error');
  } else if (Array.isArray(profiles)) {
    profiles.forEach((profile) => {
      if (profile.player_id) {
        state.convocatoria.profileIdByPlayerId[String(profile.player_id)] = profile.id;
      }
    });
  }

  const { data: attendanceRows, error: attendanceError } = await supabaseClient
    .from('attendance')
    .select('user_id,status')
    .eq('match_id', matchId);

  if (attendanceError) {
    console.error('[attendance] load error', attendanceError);
    showToast('Error cargando asistencia: ' + (attendanceError.message || attendanceError.code), 'error');
    return;
  }

  (attendanceRows || []).forEach((row) => {
    if (row.user_id) {
      state.convocatoria.attendanceByUserId[row.user_id] = row.status;
    }
  });
}

async function saveAttendance(matchId, userId, status) {
  console.log('[attendance] saving', { matchId, userId, status, type: typeof matchId });

  if (!supabaseClient) {
    const error = { message: 'Supabase no disponible', code: 'NO_CLIENT' };
    console.error('[attendance] error', error);
    state.convocatoria.lastSaveResult = JSON.stringify({ ok: false, ...error });
    showToast('Error guardando asistencia: ' + (error.message || error.code), 'error');
    return false;
  }

  if (!isUuid(matchId)) {
    const error = { message: 'matchId no es UUID de Supabase', code: 'BAD_MATCH_ID', matchId };
    console.error('[attendance] error', error);
    state.convocatoria.lastSaveResult = JSON.stringify({ ok: false, ...error });
    showToast('Error guardando asistencia: ' + error.message, 'error');
    return false;
  }

  const normalizedStatus = normalizeAttendanceStatus(status);
  const { data, error } = await supabaseClient
    .from('attendance')
    .upsert({ match_id: matchId, user_id: userId, status: normalizedStatus }, { onConflict: 'match_id,user_id' })
    .select();

  if (error) {
    console.error('[attendance] error', error);
    state.convocatoria.lastSaveResult = JSON.stringify({ ok: false, message: error.message, code: error.code });
    showToast('Error guardando asistencia: ' + (error.message || error.code), 'error');
    return false;
  }

  console.log('[attendance] ok', data);
  state.convocatoria.lastSaveResult = JSON.stringify({ ok: true, rows: Array.isArray(data) ? data.length : 0 });
  showToast('Asistencia guardada', 'success');
  return true;
}

async function loadData() {
  const emptyData = { players: [], matches: [], lineup: [] };

  if (!supabaseClient) {
    state.data = emptyData;
    state.lineupsByMatch = {};
    return;
  }

  try {
    const [playersRes, matchesRes, lineupsRes] = await Promise.all([
      supabaseClient.from('players').select('*').order('number', { ascending: true, nullsFirst: false }),
      supabaseClient.from('matches').select('*').order('date_time', { ascending: true }),
      supabaseClient.from('lineups').select('match_id, player_id, position_slot')
    ]);

    if (playersRes.error) throw playersRes.error;
    if (matchesRes.error) throw matchesRes.error;
    if (lineupsRes.error) throw lineupsRes.error;

    state.data = {
      players: (playersRes.data || []).map(mapPlayerRow),
      matches: (matchesRes.data || []).map(mapMatchRow),
      lineup: []
    };

    state.lineupsByMatch = {};
    (lineupsRes.data || []).forEach((row) => {
      if (!row?.match_id || !row?.player_id || !row?.position_slot) return;
      const matchId = String(row.match_id);
      if (!state.lineupsByMatch[matchId]) state.lineupsByMatch[matchId] = {};
      state.lineupsByMatch[matchId][String(row.position_slot)] = String(row.player_id);
    });
  } catch (error) {
    console.error(error);
    state.data = emptyData;
    state.lineupsByMatch = {};
    showToast(error.message || 'Error cargando datos desde Supabase', 'error');
  }
}

function readJSON(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


function getPlayers() {
  const override = readJSON('playerStatsOverride', {});
  return state.data.players.map((p) => ({ ...p, stats: { ...p.stats, ...(override[p.id] || {}) } }));
}

function getMatches() {
  const resultOverride = readJSON('matchResultsOverride', {});
  return [...state.data.matches]
    .map((m) => ({ ...m, result: resultOverride[m.id] ?? m.result }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}


function getUpcomingMatch() {
  const now = new Date();
  return getMatches().find((m) => new Date(m.date) >= now) || null;
}

function isPendingMatch(match) {
  if (!match) return false;
  const now = new Date();
  const past = new Date(match.date) < now;
  const missingResult = match.result_home === null || match.result_home === undefined || match.result_away === null || match.result_away === undefined;
  return past && missingResult;
}

async function refreshPostMatchState() {
  if (!supabaseClient) {
    state.pendingMatches = [];
    return;
  }
  const nowIso = new Date().toISOString();
  const [{ data: nextRows, error: nextErr }, { data: pendingRows, error: pendingErr }] = await Promise.all([
    supabaseClient.from('matches').select('*').gte('date_time', nowIso).order('date_time', { ascending: true }).limit(1),
    supabaseClient.from('matches').select('*').lt('date_time', nowIso).or('result_home.is.null,result_away.is.null').order('date_time', { ascending: false })
  ]);

  if (!nextErr && Array.isArray(nextRows) && nextRows[0]) {
    const nextMapped = mapMatchRow(nextRows[0]);
    const idx = state.data.matches.findIndex((m) => m.id === nextMapped.id);
    if (idx >= 0) state.data.matches[idx] = nextMapped;
    else state.data.matches.push(nextMapped);
  }

  if (pendingErr) {
    console.error('[post-match] pending query error', pendingErr);
    state.pendingMatches = [];
    return;
  }

  state.pendingMatches = (pendingRows || []).map(mapMatchRow);
}

function detectFormation(assignments = {}) {
  const slots = Object.keys(assignments);
  if (slots.includes('D3')) return '1-3-2-1';
  return '1-2-3-1';
}

function getLineupAssignments(matchId) {
  return state.lineupsByMatch[matchId] || {};
}

function playerNameById(playerId) {
  return getPlayers().find((p) => p.id === playerId)?.name || 'Jugador';
}

function renderLineupField(container, assignments, formation, options = {}) {
  if (!container) return;
  const config = FORMATIONS[formation] || FORMATIONS['1-2-3-1'];
  const clickable = Boolean(options.clickable);
  const selectedSlot = options.selectedSlot || '';
  const playersById = Object.fromEntries(getPlayers().map((p) => [p.id, p]));

  container.classList.add('lineup-field');
  container.innerHTML = config.slots.map((slot) => {
    const pos = config.positions[slot] || { x: 50, y: 50 };
    const playerId = assignments[slot] || '';
    const player = playersById[playerId];
    const playerName = player?.name || 'Vacío';
    const classes = [
      'lineup-player',
      player ? 'has-player' : 'empty',
      selectedSlot === slot ? 'selected' : '',
      clickable ? 'clickable' : ''
    ].filter(Boolean).join(' ');

    return `
      <button type="button" class="${classes}" style="left:${pos.x}%;top:${pos.y}%" ${clickable ? `data-action="lineup-slot" data-slot="${slot}"` : 'disabled'}>
        <small>${slot}</small>
        <span>${playerName}</span>
      </button>
    `;
  }).join('');
}

function renderLineupForMatch(containerId, messageId, matchId) {
  const container = $(containerId);
  const message = $(messageId);
  if (!container || !message) return;

  const assignments = getLineupAssignments(matchId);
  const hasLineup = Object.keys(assignments).length > 0;

  if (!hasLineup) {
    container.className = 'lineup-field hidden';
    container.innerHTML = '';
    message.textContent = 'Sin alineación definida';
    return;
  }

  const formation = detectFormation(assignments);
  message.textContent = `Formación ${formation}`;
  container.classList.remove('hidden');
  renderLineupField(container, assignments, formation);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(status) {
  if (status === 'yes') return '✅ Confirmado';
  if (status === 'no') return '❌ Baja';
  if (status === 'maybe') return '⏳ Dudoso';
  return '⏳ Pendiente';
}


function normalizeAuthName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function buildAuthCredentials() {
  const identifier = $('email').value.trim();
  const dorsalRaw = $('dorsal')?.value?.trim() || '';
  const manualPassword = $('password').value.trim();

  if (identifier.includes('@')) {
    if (dorsalRaw) {
      const name = normalizeAuthName(identifier.split('@')[0]);
      const dorsal = String(Number(dorsalRaw));
      const base = `${name}${dorsal}`;
      const password = base.length < 6 ? `${name}${String(dorsal).padStart(2, '0')}` : base;
      return { email: identifier, password };
    }
    return { email: identifier, password: manualPassword };
  }

  const name = normalizeAuthName(identifier);
  if (!name || !dorsalRaw) return { email: '', password: '' };
  const dorsal = String(Number(dorsalRaw));
  const email = `${name}@${AUTH_EMAIL_DOMAIN}`;
  const base = `${name}${dorsal}`;
  const password = base.length < 6 ? `${name}${String(dorsal).padStart(2, '0')}` : base;
  return { email, password };
}

function parseResult(result) {
  if (!result || result === '-' || !result.includes('-')) return null;
  const [a, b] = result.split('-').map((n) => Number(n.trim()));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return [a, b];
}

function getVotesTotals() {
  return state.mvp.globalTotals || {};
}

function getSessionUser() {
  const user = state.session?.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: state.profile?.display_name || (user.email || 'jugador').split('@')[0],
    role: state.profile?.role || null,
    profileId: state.profile?.id || user.id,
    playerId: state.profile?.player_id ? String(state.profile.player_id) : null
  };
}

function isAdmin() {
  return String(state.profile?.role || '').trim().toLowerCase() === 'admin';
}

function getCurrentPlayer() {
  const sessionUser = getSessionUser();
  if (!sessionUser) return null;
  const byProfile = getPlayers().find((p) => p.id === sessionUser.playerId);
  if (byProfile) return byProfile;
  const display = (sessionUser.displayName || '').toLowerCase();
  return getPlayers().find((p) => p.name.toLowerCase() === display) || null;
}

function setProfileBanner(message = '') {
  let banner = $('profileErrorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'profileErrorBanner';
    banner.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;z-index:9999;background:#fff3cd;color:#664d03;border:1px solid #ffecb5;border-radius:8px;padding:6px 10px;font-size:12px;display:none;';
    document.body.prepend(banner);
  }

  if (!message) {
    banner.textContent = '';
    banner.style.display = 'none';
    return;
  }

  banner.textContent = message;
  banner.style.display = 'block';
}

function refreshAdminUI() {
  renderAdmin();
  route();
  renderAuthDebugPanel();
}

async function fetchCurrentProfile(userId) {
  state.profileStatus = 'loading';
  state.profile = null;
  state.profileFetchErrorMessage = '';

  if (!supabaseClient || !userId) {
    state.profileStatus = 'error';
    state.profileFetchErrorMessage = 'Sesión inválida o cliente no disponible';
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('id, role, display_name, player_id')
    .eq('id', userId)
    .single();

  if (error) {
    state.profileStatus = 'error';
    state.profileFetchErrorMessage = error.message || 'Error desconocido';
    setProfileBanner('No puedo leer tu perfil (RLS?). Contacta con admin.');
    console.error('[profile] fetch error', error);
    return null;
  }

  state.profile = profile;
  state.profileStatus = 'ready';
  state.profileFetchErrorMessage = '';
  setProfileBanner('');
  if (DEBUG_AUTH) {
    console.log('[auth-debug] session.user.id:', userId, 'profile.role:', profile.role);
  }
  refreshAdminUI();
  return profile;
}


function renderAuthDebugPanel() {
  const app = $('app');
  if (!app) return;

  let panel = $('authDebugPanel');
  if (!state.session?.user) {
    if (panel) panel.classList.add('hidden');
    return;
  }

  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'authDebugPanel';
    panel.className = 'card';
    panel.style.cssText = 'margin:0 0 .75rem 0;font-size:.82rem;background:#eef7ff;border:1px solid #cfe6ff;';
    app.prepend(panel);
  }

  panel.classList.remove('hidden');
  panel.innerHTML = [
    '<strong>Debug Auth/Profile</strong>',
    `<div>session.user.id: ${state.session?.user?.id || '-'}</div>`,
    `<div>session.user.email: ${state.session?.user?.email || '-'}</div>`,
    `<div>profile fetch ok: ${state.profileStatus}</div>`,
    `<div>profile.role: ${state.profile?.role || '-'}</div>`,
    `<div>computedIsAdmin: ${String(isAdmin())}</div>`,
    `<div>profile fetch error: ${state.profileFetchErrorMessage || '-'}</div>`
  ].join('');
}

function route() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const adminEnabled = state.profileStatus === 'ready' && isAdmin();
  const view = hash === 'admin' && !adminEnabled ? 'home' : hash;

  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.bottom-nav a').forEach((el) => el.classList.toggle('active', el.dataset.tab === view));
}

function renderHome() {
  const players = getPlayers();
  if (!players.length) {
    $('myStats').innerHTML = '<p>Sin jugadores cargados todavía.</p>';
    $('topMvpList').innerHTML = '<li>Sin datos de MVP todavía.</li>';
    $('lineupHomeMessage').textContent = 'Sin alineación definida';
    $('lineupFieldHome').classList.add('hidden');
    $('lineupFieldHome').innerHTML = '';
    $('nextMatchText').textContent = 'Sin partido próximo';
    return;
  }

  const me = getCurrentPlayer() || players[0];
  const nextMatch = getUpcomingMatch();
  const votes = getVotesTotals();
  const ranking = players
    .map((p) => ({ ...p, totalMvp: (votes[p.id] || 0) }))
    .sort((a, b) => b.totalMvp - a.totalMvp);

  $('myStats').innerHTML = [
    ['Goles', me.stats.goles], ['Asist.', me.stats.asistencias], ['Amar.', me.stats.amarillas],
    ['Rojas', me.stats.rojas], ['MVPs', (votes[me.id] || 0)]
  ].map(([label, value]) => `<div class="stat-item"><small>${label}</small><strong>${value}</strong></div>`).join('');

  $('nextMatchText').textContent = `${nextMatch ? `${formatDate(nextMatch.date)} vs ${nextMatch.rival}` : 'Sin partido próximo'}`;
  $('homePendingHint').textContent = state.pendingMatches.length ? `Último partido: pendiente (${state.pendingMatches[0].rival})` : '';

  const adminPendingCard = $('adminPendingCard');
  if (isAdmin() && state.pendingMatches.length) {
    adminPendingCard.classList.remove('hidden');
    $('adminPendingList').innerHTML = state.pendingMatches.map((m) => `<li>${formatDate(m.date)} · ${m.rival} <button type="button" data-action="open-post-match" data-id="${m.id}">Actualizar ahora</button></li>`).join('');
  } else {
    adminPendingCard.classList.add('hidden');
    $('adminPendingList').innerHTML = '';
  }

  $('topMvpList').innerHTML = ranking.slice(0, 5).map((p) => `<li>${p.name} <span class="badge">${p.totalMvp}</span></li>`).join('') || '<li>Sin votos aún.</li>';
  renderLineupForMatch('lineupFieldHome', 'lineupHomeMessage', nextMatch?.id || null);
}

function renderConvocatoria() {
  const matches = getMatches();
  const uuidMatches = matches.filter((m) => isUuid(m.id));
  const upcoming = uuidMatches.find((m) => new Date(m.date) > new Date()) || uuidMatches[0];
  if (!state.selectedMatchId || !isUuid(state.selectedMatchId)) state.selectedMatchId = upcoming?.id || uuidMatches[0]?.id || null;

  if (!uuidMatches.length) {
    $('matchSelector').innerHTML = '';
    $('attendanceList').innerHTML = '<li>No hay partidos con UUID de Supabase para Convocatoria.</li>';
    $('countConfirmados').textContent = 'Confirmados: 0';
    $('countPendientes').textContent = 'Pendientes: 0';
    $('countBajas').textContent = 'Bajas: 0';
    return;
  }

  $('matchSelector').innerHTML = uuidMatches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('matchSelector').value = state.selectedMatchId;

  const players = getPlayers();
  const adminMode = isAdmin();
  const sessionUser = getSessionUser();
  const authUid = sessionUser?.id;

  console.log('[attendance] selectedMatchId', state.selectedMatchId, typeof state.selectedMatchId);

  if (!isUuid(state.selectedMatchId)) {
    $('attendanceList').innerHTML = '<li>Este partido no tiene UUID de Supabase. Convocatoria solo usa public.attendance.</li>';
    $('countConfirmados').textContent = 'Confirmados: 0';
    $('countPendientes').textContent = 'Pendientes: 0';
    $('countBajas').textContent = 'Bajas: 0';

    const debug = $('convocatoriaDebug');
    if (debug && adminMode) {
      debug.classList.remove('hidden');
      debug.textContent = [
        '[debug/convocatoria]',
        `selectedMatchId: ${state.selectedMatchId || '-'}`,
        `type: ${typeof state.selectedMatchId}`,
        `authUid: ${authUid || '-'}`,
        `playerId: ${sessionUser?.playerId || '-'}`,
        `lastSave: ${state.convocatoria.lastSaveResult || '-'}`
      ].join('\n');
    }
    return;
  }

  if (state.convocatoria.matchId !== state.selectedMatchId) {
    $('attendanceList').innerHTML = '<li>Cargando asistencia...</li>';
    loadConvocatoriaData(state.selectedMatchId).then(() => renderConvocatoria());
    return;
  }

  let confirmados = 0;
  let pendientes = 0;
  let bajas = 0;

  $('attendanceList').innerHTML = players.map((p) => {
    const userId = state.convocatoria.profileIdByPlayerId[p.id];
    const st = getConvocatoriaStatusForPlayer(p.id);

    if (st === 'yes') confirmados += 1;
    else if (st === 'no') bajas += 1;
    else pendientes += 1;

    const isOwnPlayer = p.id === sessionUser?.playerId;
    const editable = adminMode ? Boolean(userId) : (isOwnPlayer && userId === authUid);
    const showActions = adminMode || isOwnPlayer;
    const disabledAttr = editable ? '' : 'disabled';

    const accountHint = !userId ? '<small>sin cuenta</small>' : '';

    return `<li>
      <strong>${p.name}</strong> <span class="badge">${statusLabel(st)}</span> ${accountHint}
      <div class="att-actions ${showActions ? '' : 'hidden'}">
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="yes" ${disabledAttr}>✅</button>
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="maybe" ${disabledAttr}>⏳</button>
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="no" ${disabledAttr}>❌</button>
      </div>
    </li>`;
  }).join('');

  $('countConfirmados').textContent = `Confirmados: ${confirmados}`;
  $('countPendientes').textContent = `Pendientes: ${pendientes}`;
  $('countBajas').textContent = `Bajas: ${bajas}`;

  const debug = $('convocatoriaDebug');
  if (debug) {
    if (adminMode) {
      debug.classList.remove('hidden');
      debug.textContent = [
        '[debug/convocatoria]',
        `selectedMatchId: ${state.selectedMatchId || '-'}`,
        `type: ${typeof state.selectedMatchId}`,
        `authUid: ${authUid || '-'}`,
        `playerId: ${sessionUser?.playerId || '-'}`,
        `lastSave: ${state.convocatoria.lastSaveResult || '-'}`
      ].join('\n');
    } else {
      debug.classList.add('hidden');
      debug.textContent = '';
    }
  }
}

function renderCalendario() {
  const matches = getMatches();
  if (!matches.length) {
    $('calendarList').innerHTML = '<li>No hay partidos cargados todavía.</li>';
    return;
  }

  $('calendarList').innerHTML = matches.map((m) => `
    <li>
      <button type="button" data-action="open-match" data-id="${m.id}">
        ${formatDate(m.date)} · ${m.rival} (${m.home ? 'Casa' : 'Fuera'}) · ${m.venue || 'Velòdrom F7'} · ${m.result}
      </button>
      ${isPendingMatch(m) ? '<span class="badge pending">Pendiente de actualizar</span>' : ''}
    </li>
  `).join('');
}

function renderClub() {
  const matches = getMatches();
  let PJ = 0, PG = 0, PE = 0, PP = 0, GF = 0, GC = 0;

  matches.forEach((m) => {
    const parsed = parseResult(m.result);
    if (!parsed) return;
    PJ += 1;
    const [a, b] = parsed;
    const our = m.home ? a : b;
    const their = m.home ? b : a;
    GF += our;
    GC += their;
    if (our > their) PG += 1;
    else if (our === their) PE += 1;
    else PP += 1;
  });

  $('clubStats').innerHTML = [
    ['PJ', PJ], ['PG', PG], ['PE', PE], ['PP', PP], ['GF', GF], ['GC', GC]
  ].map(([k, v]) => `<div class="stat-item"><small>${k}</small><strong>${v}</strong></div>`).join('');

  const players = getPlayers();
  $('squadList').innerHTML = players.length
    ? players.map((p) => `<li><strong>#${p.dorsal} ${p.name}</strong> (${p.position}) · G:${p.stats.goles} A:${p.stats.asistencias} MVP:${p.stats.mvps}</li>`).join('')
    : '<li>No hay jugadores cargados todavía.</li>';
}


async function loadMvpData(selectedMatchId) {
  state.mvp.selectedMatchId = selectedMatchId || state.mvp.selectedMatchId;
  state.mvp.votesByPlayerForSelected = {};
  state.mvp.globalTotals = {};

  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('mvp_votes')
    .select('match_id,voter_user_id,voted_player_id');

  if (error) {
    console.error(error);
    showToast(error.message || 'Error cargando votos MVP', 'error');
    return;
  }

  (data || []).forEach((row) => {
    const playerId = String(row.voted_player_id || '');
    if (!playerId) return;
    state.mvp.globalTotals[playerId] = (state.mvp.globalTotals[playerId] || 0) + 1;
    if (state.mvp.selectedMatchId && row.match_id === state.mvp.selectedMatchId) {
      state.mvp.votesByPlayerForSelected[playerId] = (state.mvp.votesByPlayerForSelected[playerId] || 0) + 1;
    }
  });
}


async function resolveMvpPayload(matchId, playerId) {
  const { data: match, error: matchError } = await supabaseClient
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) {
    console.error(matchError);
    showToast(matchError.message || 'Error verificando partido MVP', 'error');
    return null;
  }

  if (!match?.id || !isUuid(match.id)) {
    const error = { message: 'Partido MVP inválido (UUID requerido)', code: 'BAD_MATCH_UUID', matchId };
    console.error(error);
    showToast(error.message, 'error');
    return null;
  }

  const { data: player, error: playerError } = await supabaseClient
    .from('players')
    .select('id')
    .eq('id', playerId)
    .maybeSingle();

  if (playerError) {
    console.error(playerError);
    showToast(playerError.message || 'Error verificando jugador MVP', 'error');
    return null;
  }

  if (!player?.id || !isUuid(player.id)) {
    const error = { message: 'Jugador MVP inválido (UUID requerido)', code: 'BAD_PLAYER_UUID', playerId };
    console.error(error);
    showToast(error.message, 'error');
    return null;
  }

  return {
    match_id: match.id,
    voter_user_id: getSessionUser()?.id,
    voted_player_id: player.id
  };
}

async function saveMvpVote(matchId, votedPlayerId) {
  const payload = await resolveMvpPayload(matchId, votedPlayerId);
  if (!payload) return false;

  state.mvp.lastVotePayload = JSON.stringify(payload);
  console.log('MVP vote payload:', payload);

  const { error } = await supabaseClient
    .from('mvp_votes')
    .upsert(payload, { onConflict: 'match_id,voter_user_id' });

  if (error) {
    console.error(error);
    showToast(error.message || 'Error guardando voto MVP', 'error');
    return false;
  }

  showToast('Voto registrado', 'success');
  return true;
}

function renderMvp() {
  const matches = getMatches().filter((m) => isUuid(m.id));
  const players = getPlayers().filter((p) => isUuid(p.id));
  const upcoming = matches.find((m) => new Date(m.date) > new Date()) || matches[0];

  if (!matches.length || !players.length) {
    $('mvpMatchSelector').innerHTML = '';
    $('mvpPlayerSelector').innerHTML = '';
    $('mvpRankingList').innerHTML = '<li>Sin datos para MVP todavía.</li>';
    return;
  }

  if (!state.mvp.selectedMatchId || !isUuid(state.mvp.selectedMatchId)) {
    state.mvp.selectedMatchId = upcoming?.id || matches[0].id;
  }

  if (!matches.length || !players.length) {
    $('mvpMatchSelector').innerHTML = '';
    $('mvpPlayerSelector').innerHTML = '';
    $('mvpRankingList').innerHTML = '<li>Sin datos para MVP todavía.</li>';
    return;
  }

  $('mvpMatchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('mvpMatchSelector').value = state.mvp.selectedMatchId;
  $('mvpPlayerSelector').innerHTML = players.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

  const votesForSelected = state.mvp.votesByPlayerForSelected || {};
  const ranking = players
    .map((p) => ({ ...p, total: (state.mvp.globalTotals[p.id] || 0), selectedVotes: votesForSelected[p.id] || 0 }))
    .sort((a, b) => b.total - a.total);

  $('mvpRankingList').innerHTML = ranking.map((p) => `<li>${p.name} <span class="badge">${p.total}</span> <small>(${p.selectedVotes} en partido)</small></li>`).join('');

  const debug = $('mvpDebug');
  if (debug && isAdmin()) {
    debug.classList.remove('hidden');
    debug.textContent = [
      '[debug/mvp]',
      `matchId: ${state.mvp.selectedMatchId || '-'}`,
      `authUid: ${getSessionUser()?.id || '-'}`,
      `lastVote: ${state.mvp.lastVotePayload || '-'}`
    ].join('\n');
  } else if (debug) {
    debug.classList.add('hidden');
    debug.textContent = '';
  }
}


function hydrateLineupEditor(matchId) {
  const assignments = { ...(getLineupAssignments(matchId) || {}) };
  const formation = detectFormation(assignments);
  const slots = FORMATIONS[formation].slots;
  const cleaned = {};
  slots.forEach((slot) => {
    if (assignments[slot]) cleaned[slot] = assignments[slot];
  });

  state.lineupEditor.selectedMatchId = matchId;
  state.lineupEditor.formation = formation;
  state.lineupEditor.selectedSlot = slots[0];
  state.lineupEditor.assignments = cleaned;
  state.lineupEditor.originalAssignments = { ...cleaned };
}

function normalizeAssignmentsForFormation(assignments, formation) {
  const slots = FORMATIONS[formation].slots;
  const normalized = {};
  slots.forEach((slot) => {
    const playerId = assignments[slot];
    if (playerId && isUuid(playerId)) normalized[slot] = playerId;
  });
  return normalized;
}

function assignLineupPlayer(slot, playerIdRaw) {
  const playerId = playerIdRaw || '';
  const assignments = { ...state.lineupEditor.assignments };

  Object.keys(assignments).forEach((key) => {
    if (assignments[key] === playerId) delete assignments[key];
  });

  if (!playerId) {
    delete assignments[slot];
  } else {
    assignments[slot] = playerId;
  }

  state.lineupEditor.assignments = assignments;
}

async function saveLineupForMatch(matchId, nextAssignments) {
  if (!supabaseClient) {
    const error = { message: 'Supabase no disponible', code: 'NO_CLIENT' };
    console.error('[lineups] error', error);
    showToast('Error guardando alineación: ' + error.message, 'error');
    return false;
  }

  if (!isUuid(matchId)) {
    const error = { message: 'match_id inválido para alineación', code: 'BAD_MATCH_ID', matchId };
    console.error('[lineups] error', error);
    showToast('Error guardando alineación: ' + error.message, 'error');
    return false;
  }

  const { error: deleteError } = await supabaseClient
    .from('lineups')
    .delete()
    .eq('match_id', matchId);

  if (deleteError) {
    console.error('[lineups] delete error', deleteError);
    showToast('Error guardando alineación: ' + (deleteError.message || deleteError.code), 'error');
    return false;
  }

  const upsertRows = Object.entries(nextAssignments || {}).map(([slot, playerId]) => ({
    match_id: matchId,
    player_id: playerId,
    position_slot: slot
  }));

  if (upsertRows.length) {
    const { error: upsertError } = await supabaseClient
      .from('lineups')
      .upsert(upsertRows, { onConflict: 'match_id,player_id' });

    if (upsertError) {
      console.error('[lineups] upsert error', upsertError);
      showToast('Error guardando alineación: ' + (upsertError.message || upsertError.code), 'error');
      return false;
    }
  }

  const { data: finalRows, error: finalError } = await supabaseClient
    .from('lineups')
    .select('match_id, player_id, position_slot')
    .eq('match_id', matchId);

  if (finalError) {
    console.error('[lineups] reload error', finalError);
    showToast('Error recargando alineación: ' + (finalError.message || finalError.code), 'error');
    return false;
  }

  state.lineupsByMatch[matchId] = {};
  (finalRows || []).forEach((row) => {
    state.lineupsByMatch[matchId][String(row.position_slot)] = String(row.player_id);
  });

  return true;
}

function renderLineupEditor() {
  const matchSelect = $('lineupMatchSelector');
  const formationToggle = $('lineupFormationToggle');
  const field = $('lineupFieldAdmin');
  const slotSelect = $('lineupSlotSelector');
  const playerSelect = $('lineupPlayerSelectorForSlot');
  if (!matchSelect || !formationToggle || !field || !slotSelect || !playerSelect) return;

  const matches = getMatches().filter((m) => isUuid(m.id));
  if (!matches.length) {
    matchSelect.innerHTML = '';
    field.classList.add('hidden');
    $('lineupAdminMessage').textContent = 'No hay partidos UUID para editar alineación.';
    return;
  }

  if (!state.lineupEditor.selectedMatchId || !isUuid(state.lineupEditor.selectedMatchId)) {
    state.lineupEditor.selectedMatchId = matches[0].id;
    hydrateLineupEditor(state.lineupEditor.selectedMatchId);
  }

  if (!matches.some((m) => m.id === state.lineupEditor.selectedMatchId)) {
    state.lineupEditor.selectedMatchId = matches[0].id;
    hydrateLineupEditor(state.lineupEditor.selectedMatchId);
  }

  matchSelect.innerHTML = matches.map((m) => `<option value="${m.id}">${m.id} · ${formatDate(m.date)} · ${m.rival}</option>`).join('');
  matchSelect.value = state.lineupEditor.selectedMatchId;

  const formation = state.lineupEditor.formation;
  const slots = FORMATIONS[formation].slots;
  if (!slots.includes(state.lineupEditor.selectedSlot)) state.lineupEditor.selectedSlot = slots[0];

  formationToggle.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.formation === formation);
  });

  slotSelect.innerHTML = slots.map((slot) => `<option value="${slot}">${slot}</option>`).join('');
  slotSelect.value = state.lineupEditor.selectedSlot;

  const players = getPlayers().filter((p) => isUuid(p.id));
  const usedPlayers = new Set(Object.values(state.lineupEditor.assignments));
  const currentPlayer = state.lineupEditor.assignments[state.lineupEditor.selectedSlot] || '';
  const options = ['<option value="">-- Vaciar slot --</option>'].concat(
    players
      .filter((p) => p.id === currentPlayer || !usedPlayers.has(p.id))
      .map((p) => `<option value="${p.id}">${p.name}</option>`)
  );
  playerSelect.innerHTML = options.join('');
  playerSelect.value = currentPlayer;

  $('lineupAdminMessage').textContent = `Editando ${state.lineupEditor.selectedMatchId}`;
  field.classList.remove('hidden');
  renderLineupField(field, state.lineupEditor.assignments, formation, {
    clickable: true,
    selectedSlot: state.lineupEditor.selectedSlot
  });
}

function renderAdmin() {
  const adminMode = isAdmin();
  document.querySelector('.admin-tab').classList.toggle('hidden', !adminMode);
  document.querySelector('[data-view="admin"]').classList.toggle('hidden', !adminMode);

  if (!adminMode) return;

  const matches = getMatches();
  const players = getPlayers();

  $('adminMatchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('adminPlayerSelector').innerHTML = players.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  renderLineupEditor();
}

function renderAll() {
  $('welcomeText').textContent = `Hola, ${getSessionUser()?.displayName || 'jugador'}`;
  renderHome();
  renderConvocatoria();
  renderCalendario();
  renderClub();
  renderMvp();
  renderAdmin();
  route();
}

function showToast(text, type = "info") {
  const t = $('toast');
  t.textContent = text;
  t.dataset.type = type;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

function generateConvImage(matchId) {
  const match = getMatches().find((m) => m.id === matchId);
  if (!match) return;
  const players = getPlayers();
  const confirmed = players.filter((p) => getConvocatoriaStatusForPlayer(p.id) === 'yes');

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4DA3FF';
  ctx.fillRect(0, 0, canvas.width, 180);
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('EL INTER DE VERDUN', 60, 100);
  ctx.fillStyle = '#13324f';
  ctx.font = 'bold 44px Arial';
  ctx.fillText(`vs ${match.rival}`, 60, 250);
  ctx.font = '32px Arial';
  ctx.fillText(formatDate(match.date), 60, 300);
  ctx.fillText('Confirmados:', 60, 380);

  ctx.font = '30px Arial';
  let y = 440;
  confirmed.forEach((p, i) => {
    ctx.fillText(`${i + 1}. ${p.name}`, 80, y);
    y += 44;
  });

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `convocatoria-${match.id}.png`;
  link.click();
}


function openPostMatchModal(matchId) {
  if (!isAdmin()) {
    showToast('Solo admin', 'error');
    return;
  }
  const match = getMatches().find((m) => m.id === matchId);
  if (!match) return;
  state.postMatchEditor.open = true;
  state.postMatchEditor.matchId = matchId;
  state.postMatchEditor.playerStatsDraft = Object.fromEntries(
    getPlayers().map((p) => [p.id, { goals: p.stats.goles, assists: p.stats.asistencias, yc: p.stats.amarillas, rc: p.stats.rojas, mvps: p.stats.mvps }])
  );

  $('postMatchTitle').textContent = `Post-partido · ${match.rival}`;
  $('postResultHome').value = match.result_home ?? '';
  $('postResultAway').value = match.result_away ?? '';
  $('postPlayersList').innerHTML = getPlayers().map((p) => {
    const d = state.postMatchEditor.playerStatsDraft[p.id];
    return `<div><strong>#${p.dorsal} ${p.name}</strong>
      <input data-stat-player="${p.id}" data-stat-key="goals" type="number" min="0" value="${d.goals}">
      <input data-stat-player="${p.id}" data-stat-key="assists" type="number" min="0" value="${d.assists}">
      <input data-stat-player="${p.id}" data-stat-key="yc" type="number" min="0" value="${d.yc}">
      <input data-stat-player="${p.id}" data-stat-key="rc" type="number" min="0" value="${d.rc}">
      <input data-stat-player="${p.id}" data-stat-key="mvps" type="number" min="0" value="${d.mvps}"></div>`;
  }).join('');

  $('postMatchModal').showModal();
}

async function savePostMatchModal() {
  if (!isAdmin()) {
    showToast('Solo admin', 'error');
    return;
  }
  const matchId = state.postMatchEditor.matchId;
  const result_home = Number($('postResultHome').value);
  const result_away = Number($('postResultAway').value);

  const { error: matchError } = await supabaseClient.from('matches').update({ result_home, result_away }).eq('id', matchId);
  if (matchError) {
    showToast(matchError.message || 'Error guardando resultado', 'error');
    return;
  }

  const updates = Object.entries(state.postMatchEditor.playerStatsDraft).map(([playerId, d]) => (
    supabaseClient.from('players').update({ goals: Number(d.goals), assists: Number(d.assists), yc: Number(d.yc), rc: Number(d.rc), mvps: Number(d.mvps) }).eq('id', playerId)
  ));
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    showToast(failed.error.message || 'Error guardando stats', 'error');
    return;
  }

  $('postMatchModal').close();
  await hydrateSessionData();
  renderAll();
  showToast('Post-partido actualizado', 'success');
}

function openMatchModal(matchId) {
  const m = getMatches().find((x) => x.id === matchId);
  if (!m) return;
  $('modalTitle').textContent = `${m.rival} · ${formatDate(m.date)}`;
  $('modalDetail').innerHTML = `Localía: ${m.home ? 'Casa' : 'Fuera'} · Campo: ${m.venue || 'Velòdrom F7'} · Resultado: ${m.result} ${isPendingMatch(m) ? '<span class="badge pending">Pendiente de actualizar</span>' : ''}`;
  renderLineupForMatch('lineupFieldModal', 'lineupModalMessage', m.id);

  const adminZone = $('modalAdminEdit');
  const adminMode = isAdmin();
  adminZone.classList.toggle('hidden', !adminMode);
  $('openPostMatchFromModalBtn').onclick = () => openPostMatchModal(m.id);

  $('matchModal').showModal();
}

function applyAuthUI(session) {
  state.session = session;
  const loggedIn = Boolean(session?.user);
  $('loginScreen').classList.toggle('hidden', loggedIn);
  $('app').classList.toggle('hidden', !loggedIn);

  if (!loggedIn) {
    state.profile = null;
    state.profileStatus = 'loading';
    state.profileFetchErrorMessage = '';
    state.pendingMatches = [];
    setProfileBanner('');
    renderAuthDebugPanel();
    window.location.hash = '#home';
    return;
  }

  if (state.profileStatus !== 'ready') {
    document.querySelector('.admin-tab')?.classList.add('hidden');
    document.querySelector('[data-view="admin"]')?.classList.add('hidden');
  }

  if (!window.location.hash) window.location.hash = '#home';
  if (state.profileStatus === 'ready') renderAll();
}

async function hydrateSessionData() {
  await loadData();
  await refreshPostMatchState();
  state.selectedMatchId = state.selectedMatchId || getUpcomingMatch()?.id || getMatches()[0]?.id;
  await loadConvocatoriaData(state.selectedMatchId);
  await loadMvpData(getMatches().find((m) => isUuid(m.id))?.id || null);
  const lineupMatchId = getMatches().find((m) => isUuid(m.id))?.id || null;
  if (lineupMatchId) hydrateLineupEditor(lineupMatchId);
}

async function syncSession() {
  if (!supabaseClient) {
    $('loginError').textContent = 'No se pudo inicializar Supabase.';
    applyAuthUI(null);
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    $('loginError').textContent = 'Error al recuperar sesión.';
    applyAuthUI(null);
    return;
  }

  const user = data.session?.user;
  if (!user) {
    state.profile = null;
    state.profileStatus = 'loading';
    state.profileFetchErrorMessage = '';
    applyAuthUI(null);
    return;
  }

  applyAuthUI(data.session);
  await fetchCurrentProfile(user.id);
  if (state.profileStatus !== 'ready') {
    renderAuthDebugPanel();
    return;
  }
  await hydrateSessionData();
  renderAll();
  renderAuthDebugPanel();
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').textContent = '';

    const creds = buildAuthCredentials();
    if (!creds.email || !creds.password) {
      $('loginError').textContent = 'Indica nombre/email y dorsal (o contraseña manual con email).';
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword(creds);
    if (error) {
      $('loginError').textContent = error.message || 'Credenciales incorrectas.';
      return;
    }

    await syncSession();
  });

  $('signupBtn').addEventListener('click', async () => {
    $('loginError').textContent = '';
    const creds = buildAuthCredentials();
    if (!creds.email || !creds.password) {
      $('loginError').textContent = 'Indica nombre/email y dorsal (o contraseña manual con email).';
      return;
    }

    const { error } = await supabaseClient.auth.signUp(creds);
    if (error) {
      $('loginError').textContent = error.message || 'No se pudo crear la cuenta.';
      return;
    }

    showToast('Cuenta creada. Revisa tu email si hay confirmación activa.');
  });

  $('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    applyAuthUI(null);
  });

  $('goConfirmBtn').addEventListener('click', () => {
    state.selectedMatchId = getUpcomingMatch()?.id;
    window.location.hash = '#convocatoria';
    renderConvocatoria();
    route();
  });

  $('matchSelector').addEventListener('change', async (e) => {
    state.selectedMatchId = e.target.value;
    console.log('[attendance] match change', state.selectedMatchId, typeof state.selectedMatchId);
    await loadConvocatoriaData(state.selectedMatchId);
    renderConvocatoria();
  });

  $('lineupMatchSelector')?.addEventListener('change', (e) => {
    hydrateLineupEditor(e.target.value);
    renderLineupEditor();
  });

  $('lineupSlotSelector')?.addEventListener('change', (e) => {
    state.lineupEditor.selectedSlot = e.target.value;
    renderLineupEditor();
  });

  $('lineupPlayerSelectorForSlot')?.addEventListener('change', (e) => {
    assignLineupPlayer(state.lineupEditor.selectedSlot, e.target.value);
    renderLineupEditor();
  });

  $('saveLineupBtn')?.addEventListener('click', async () => {
    const matchId = state.lineupEditor.selectedMatchId;
    const formation = state.lineupEditor.formation;
    const assignments = normalizeAssignmentsForFormation(state.lineupEditor.assignments, formation);
    const ok = await saveLineupForMatch(matchId, assignments);
    if (!ok) return;

    hydrateLineupEditor(matchId);
    renderLineupEditor();
    renderHome();
    showToast('Alineación guardada', 'success');
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.action === 'lineup-slot') {
      state.lineupEditor.selectedSlot = btn.dataset.slot;
      renderLineupEditor();
      return;
    }

    if (btn.dataset.action === 'set-formation') {
      const nextFormation = btn.dataset.formation;
      if (!FORMATIONS[nextFormation]) return;

      state.lineupEditor.formation = nextFormation;
      state.lineupEditor.assignments = normalizeAssignmentsForFormation(state.lineupEditor.assignments, nextFormation);
      if (!FORMATIONS[nextFormation].slots.includes(state.lineupEditor.selectedSlot)) {
        state.lineupEditor.selectedSlot = FORMATIONS[nextFormation].slots[0];
      }
      renderLineupEditor();
      return;
    }

    if (btn.dataset.action === 'att') {
      const status = btn.dataset.status;
      const matchId = $('matchSelector').value;
      const mappedUserId = btn.dataset.userId;
      const adminMode = isAdmin();
      const userId = adminMode ? mappedUserId : getSessionUser()?.id;
      console.log('[attendance] click save context', { selectedMatchId: matchId, type: typeof matchId, isAdmin: adminMode, targetUserId: userId });

      if (!matchId) {
        const error = { message: 'Partido no seleccionado', code: 'NO_MATCH' };
        console.error('[attendance] error', error);
        showToast('Error guardando asistencia: ' + error.message, 'error');
        return;
      }

      if (!isUuid(matchId)) {
        const error = { message: 'El partido seleccionado no es UUID de Supabase', code: 'BAD_MATCH_ID', matchId };
        console.error('[attendance] error', error);
        showToast('Error guardando asistencia: ' + error.message, 'error');
        return;
      }

      if (!supabaseClient) {
        const error = { message: 'Supabase no disponible', code: 'NO_CLIENT' };
        console.error('[attendance] error', error);
        showToast('Error guardando asistencia: ' + error.message, 'error');
        return;
      }

      if (!userId) {
        const error = { message: 'Ese jugador aún no tiene cuenta vinculada', code: 'NO_PROFILE' };
        console.error('[attendance] error', error);
        showToast(error.message, 'error');
        return;
      }

      const canEdit = adminMode || getSessionUser()?.id === userId;
      if (!canEdit) {
        const error = { message: 'Sin permisos para editar esta fila', code: 'FORBIDDEN' };
        console.error('[attendance] error', error);
        showToast('Error guardando asistencia: ' + error.message, 'error');
        return;
      }

      const ok = await saveAttendance(matchId, userId, status);
      if (!ok) return;

      state.selectedMatchId = matchId;
      await loadConvocatoriaData(matchId);
      renderConvocatoria();
      renderHome();
      showToast('Asistencia guardada');
    }

    if (btn.dataset.action === 'open-match') {
      openMatchModal(btn.dataset.id);
    }

    if (btn.dataset.action === 'open-post-match') {
      openPostMatchModal(btn.dataset.id);
    }
  });

  $('generateImageBtn').addEventListener('click', () => generateConvImage(state.selectedMatchId));
  $('adminImageBtn').addEventListener('click', () => generateConvImage(state.selectedMatchId || getUpcomingMatch()?.id));

  $('mvpMatchSelector').addEventListener('change', async (e) => {
    state.mvp.selectedMatchId = e.target.value;
    await loadMvpData(state.mvp.selectedMatchId);
    renderMvp();
  });

  $('voteBtn').addEventListener('click', async () => {
    const matchId = $('mvpMatchSelector').value;
    const playerId = $('mvpPlayerSelector').value;

    if (!isUuid(matchId) || !isUuid(playerId)) {
      const error = { message: 'match/player id inválido para MVP UUID', code: 'BAD_MVP_IDS', matchId, playerId };
      console.error(error);
      showToast(error.message, 'error');
      return;
    }

    if (!supabaseClient) {
      const error = { message: 'Supabase no disponible', code: 'NO_CLIENT' };
      console.error(error);
      showToast(error.message, 'error');
      return;
    }

    const ok = await saveMvpVote(matchId, playerId);
    if (!ok) return;

    state.mvp.selectedMatchId = matchId;
    await loadMvpData(matchId);
    $('voteMessage').textContent = 'Voto registrado.';
    renderMvp();
    renderHome();
  });

  $('emailForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const log = readJSON('emailLog', []);
    log.push({ subject: $('emailSubject').value, body: $('emailBody').value, date: new Date().toISOString() });
    writeJSON('emailLog', log);
    e.target.reset();
    showToast('Email enviado (mock)');
  });

  $('resultForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('adminMatchSelector').value;
    const o = readJSON('matchResultsOverride', {});
    o[id] = $('adminResult').value.trim() || '-';
    writeJSON('matchResultsOverride', o);
    renderAll();
    showToast('Resultado guardado');
  });

  $('adminPlayerSelector').addEventListener('change', (e) => {
    const p = getPlayers().find((x) => x.id === e.target.value);
    if (!p) return;
    $('sGoles').value = p.stats.goles;
    $('sAsist').value = p.stats.asistencias;
    $('sAma').value = p.stats.amarillas;
    $('sRojas').value = p.stats.rojas;
    $('sMvps').value = p.stats.mvps;
  });

  $('playerStatsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('adminPlayerSelector').value;
    const o = readJSON('playerStatsOverride', {});
    o[id] = {
      goles: Number($('sGoles').value),
      asistencias: Number($('sAsist').value),
      amarillas: Number($('sAma').value),
      rojas: Number($('sRojas').value),
      mvps: Number($('sMvps').value)
    };
    writeJSON('playerStatsOverride', o);
    renderAll();
    showToast('Stats actualizadas');
  });

  $('closeModalBtn').addEventListener('click', () => $('matchModal').close());
  $('savePostMatchBtn').addEventListener('click', savePostMatchModal);
  $('closePostMatchBtn').addEventListener('click', () => $('postMatchModal').close());
  $('postPlayersList').addEventListener('input', (e) => {
    const input = e.target.closest('input[data-stat-player]');
    if (!input) return;
    const pid = input.dataset.statPlayer;
    const key = input.dataset.statKey;
    if (!state.postMatchEditor.playerStatsDraft[pid]) return;
    state.postMatchEditor.playerStatsDraft[pid][key] = Number(input.value || 0);
  });
  window.addEventListener('hashchange', route);
}

async function init() {
  await loadData();
  bindEvents();

  if (!supabaseClient) {
    $('loginError').textContent = 'No se pudo cargar Supabase SDK.';
    return;
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    applyAuthUI(session || null);

    if (!session?.user) {
      return;
    }

    await fetchCurrentProfile(session.user.id);
    if (state.profileStatus !== 'ready') {
      renderAuthDebugPanel();
      return;
    }
    await hydrateSessionData();
    renderAll();
    renderAuthDebugPanel();
  });

  await syncSession();
}

init();
