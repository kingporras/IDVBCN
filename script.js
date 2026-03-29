const SUPABASE_URL = 'https://ogwhtfrmsyneojqtiemp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Bbt2M-26ya-1CE4DqZDgFg_wf7Gc6gq';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const AUTH_EMAIL_DOMAIN = '@gmail.com';

const state = {
  data: null,
  session: null,
  profile: null,
  profileStatus: 'loading',
  profileFetchErrorMessage: '',
  pendingMatches: [],
  postMatchEditor: { open: false, matchId: null, playerStatsDraft: {}, draftsByMatch: {}, ui: { q: '', onlyEdited: false } },
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
  teamStats: {
    tab: 'goals',
    attendanceStatus: 'idle',
    attendanceByPlayerId: null
  },
  lineupsByMatch: {},
  lineupEditor: {
    selectedMatchId: null,
    formation: '1-2-3-1',
    selectedSlot: 'GK',
    assignments: {},
    originalAssignments: {},
    isDirty: false
  }
};

const MATCH_RESULT_COLS = { home: 'result_home', away: 'result_away' };
const AUTO_REFRESH_COOLDOWN_MS = 45 * 1000;
let lastAutoRefreshAt = 0;
let refreshInFlight = false;

function getMatchResultTuple(match) {
  if (!match) return [null, null];
  const home = match[MATCH_RESULT_COLS.home];
  const away = match[MATCH_RESULT_COLS.away];
  if (home == null || away == null) return [null, null];
  return [Number(home), Number(away)];
}

function formatMatchResult(match) {
  const [homeGoals, awayGoals] = getMatchResultTuple(match);
  if (homeGoals == null || awayGoals == null) return '-';
  return `${homeGoals}-${awayGoals}`;
}

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
      amarillas: Number(row.amarillas ?? row.yellow_cards ?? row.yc ?? stats.amarillas ?? stats.yellow_cards ?? stats.yc ?? 0),
      rojas: Number(row.rojas ?? row.red_cards ?? row.rc ?? stats.rojas ?? stats.red_cards ?? stats.rc ?? 0),
      mvps: Number(row.mvps ?? stats.mvps ?? 0)
    }
  };
}

function mapMatchRow(row) {
  const result = row[MATCH_RESULT_COLS.home] == null || row[MATCH_RESULT_COLS.away] == null
    ? '-'
    : `${row[MATCH_RESULT_COLS.home]}-${row[MATCH_RESULT_COLS.away]}`;
  return {
    id: String(row.id),
    date: row.date_time || row.date,
    rival: row.rival || row.opponent || 'Rival',
    home: row.home ?? row.is_home ?? true,
    venue: row.venue || 'Velòdrom F7',
    result,
    [MATCH_RESULT_COLS.home]: row[MATCH_RESULT_COLS.home],
    [MATCH_RESULT_COLS.away]: row[MATCH_RESULT_COLS.away]
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

function clearMatchResultOverride(matchId) {
  const o = readJSON('matchResultsOverride', {});
  if (o && Object.prototype.hasOwnProperty.call(o, matchId)) {
    delete o[matchId];
    writeJSON('matchResultsOverride', o);
  }
}

function clearPlayerStatsOverride(playerId) {
  const o = readJSON('playerStatsOverride', {});
  if (o && Object.prototype.hasOwnProperty.call(o, playerId)) {
    delete o[playerId];
    writeJSON('playerStatsOverride', o);
  }
}

function getPlayers() {
  const override = readJSON('playerStatsOverride', {});
  return state.data.players.map((p) => ({ ...p, stats: { ...p.stats, ...(!isUuid(p.id) ? (override[p.id] || {}) : {}) } }));
}

function getMatches() {
  const resultOverride = readJSON('matchResultsOverride', {});
  return [...state.data.matches]
    .map((m) => {
      if (isUuid(m.id)) return m;
      const rawOverride = resultOverride[m.id];
      const parsedOverride = parseResult(rawOverride);
      if (!parsedOverride) return m;
      const [homeGoals, awayGoals] = parsedOverride;
      return { ...m, [MATCH_RESULT_COLS.home]: homeGoals, [MATCH_RESULT_COLS.away]: awayGoals, result: `${homeGoals}-${awayGoals}` };
    })
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
  const [homeGoals, awayGoals] = getMatchResultTuple(match);
  const missingResult = homeGoals == null || awayGoals == null;
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

function renderLineupForMatch(containerId, messageId, matchId, options = {}) {
  const container = $(containerId);
  const message = $(messageId);
  if (!container || !message) return;

  const assignments = getLineupAssignments(matchId);
  const hasLineup = Object.keys(assignments).length > 0;

  if (!hasLineup) {
    container.className = 'lineup-field hidden';
    container.innerHTML = '';
    message.textContent = options.emptyMessage || 'Sin alineación definida';
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

function formatMatchLabel(match) {
  if (!match) return '-';
  const date = new Date(match.date || Date.now()).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${date} · ${match.rival}${typeof match.home === 'boolean' ? ` · ${match.home ? 'Casa' : 'Fuera'}` : ''}`;
}

function formatMatchShort(match) {
  if (!match) return '-';
  const date = new Date(match.date || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${date} · ${match.rival}`;
}

function statusLabel(status) {
  if (status === 'yes') return '✅ Confirmado';
  if (status === 'no') return '❌ Baja';
  if (status === 'maybe') return '⏳ Dudoso';
  return '⏳ Pendiente';
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildAuthCredentials() {
  const nameOrEmail = $('email')?.value?.trim() || '';
  const password = $('password')?.value?.trim() || '';
  if (!nameOrEmail || !password) return { email: '', password: '' };
  const email = nameOrEmail.includes('@')
    ? nameOrEmail
    : `${normalizeName(nameOrEmail).replace(/\s/g, '')}${AUTH_EMAIL_DOMAIN}`;
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

function formatTeamStatValue(value, type) {
  if (type === 'attendance') return `${Number(value || 0)} asist.`;
  return Number(value || 0);
}

function computeTeamStatsModel(players, votesTotals, attendanceByPlayerId) {
  const safePlayers = Array.isArray(players) ? players : [];
  const safeVotes = votesTotals || {};
  const safeAttendance = attendanceByPlayerId || {};

  const goals = safePlayers
    .map((player) => ({ id: player.id, name: player.name || 'Jugador', value: Number(player?.stats?.goles || 0) }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const assists = safePlayers
    .map((player) => ({ id: player.id, name: player.name || 'Jugador', value: Number(player?.stats?.asistencias || 0) }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const mvp = safePlayers
    .map((player) => ({ id: player.id, name: player.name || 'Jugador', value: Number(safeVotes[player.id] || 0) }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const attendance = safePlayers
    .map((player) => ({ id: player.id, name: player.name || 'Jugador', value: Number(safeAttendance[player.id] || 0) }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const withData = (entry, type = 'default') => {
    if (!entry || Number(entry.value || 0) <= 0) return { name: 'Sin datos', value: '-' };
    return { name: entry.name, value: formatTeamStatValue(entry.value, type) };
  };

  return {
    kpis: {
      topScorer: withData(goals[0]),
      topAssistant: withData(assists[0]),
      topAttendance: withData(attendance[0], 'attendance')
    },
    rankings: {
      goals: goals.slice(0, 5),
      assists: assists.slice(0, 5),
      attendance: attendance.slice(0, 5),
      mvp: mvp.slice(0, 5)
    }
  };
}

function renderTeamStatsBlock() {
  const container = $('myStats');
  if (!container) return;

  state.teamStats = state.teamStats || { tab: 'goals', attendanceStatus: 'idle', attendanceByPlayerId: null };
  const activeTab = state.teamStats.tab || 'goals';
  const players = getPlayers();

  if (!players.length) {
    container.innerHTML = '<section class="team-stats"><p class="team-stats__empty">Aún no hay estadísticas globales disponibles.</p></section>';
    return;
  }

  const votes = getVotesTotals();
  const model = computeTeamStatsModel(players, votes, state.teamStats.attendanceByPlayerId);
  const tabs = [
    { id: 'goals', label: 'Goles' },
    { id: 'assists', label: 'Asist.' },
    { id: 'attendance', label: 'Asistencia' },
    { id: 'mvp', label: 'MVP' }
  ];
  const ranking = model.rankings[activeTab] || [];

  const rankItems = ranking.length
    ? ranking.map((item, index) => `
      <li class="team-stats__rank-row">
        <span class="team-stats__rank-pos">${index + 1}</span>
        <span class="team-stats__rank-name">${item.name}</span>
        <strong class="team-stats__rank-value">${formatTeamStatValue(item.value, activeTab)}</strong>
      </li>
    `).join('')
    : '<li class="team-stats__empty">Aún no hay estadísticas globales disponibles.</li>';

  container.innerHTML = `
    <section class="team-stats" aria-label="Estadísticas del equipo">
      <header class="team-stats__header">
        <h3 class="team-stats__title">Estadísticas del equipo</h3>
      </header>
      <div class="team-stats__kpis">
        <article class="team-stats__kpi"><small>Máximo goleador</small><strong>${model.kpis.topScorer.name}</strong><span>${model.kpis.topScorer.value}</span></article>
        <article class="team-stats__kpi"><small>Máximo asistente</small><strong>${model.kpis.topAssistant.name}</strong><span>${model.kpis.topAssistant.value}</span></article>
        <article class="team-stats__kpi"><small>Mejor asistencia</small><strong>${model.kpis.topAttendance.name}</strong><span>${model.kpis.topAttendance.value}</span></article>
      </div>
      <div class="team-stats__tabs" role="tablist" aria-label="Ranking por categoría">
        ${tabs.map((tab) => `<button type="button" class="team-stats__tab ${activeTab === tab.id ? 'is-active' : ''}" role="tab" aria-selected="${String(activeTab === tab.id)}" data-action="team-stats-tab" data-tab="${tab.id}">${tab.label}</button>`).join('')}
      </div>
      <ol class="team-stats__rank">${rankItems}</ol>
    </section>
  `;
}

async function maybeLoadTeamAttendanceTotals() {
  state.teamStats = state.teamStats || { tab: 'goals', attendanceStatus: 'idle', attendanceByPlayerId: null };
  if (!supabaseClient || state.teamStats.attendanceStatus !== 'idle') return;

  state.teamStats.attendanceStatus = 'loading';

  try {
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id,player_id');

    if (profilesError) throw profilesError;

    const profileToPlayer = {};
    (profiles || []).forEach((profile) => {
      if (profile?.id && profile?.player_id) {
        profileToPlayer[String(profile.id)] = String(profile.player_id);
      }
    });

    const { data: attendanceRows, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select('user_id,status');

    if (attendanceError) throw attendanceError;

    const attendanceByPlayerId = {};
    (attendanceRows || []).forEach((row) => {
      if (String(row?.status || '').toLowerCase() !== 'yes') return;
      const playerId = profileToPlayer[String(row?.user_id || '')];
      if (!playerId) return;
      attendanceByPlayerId[playerId] = (attendanceByPlayerId[playerId] || 0) + 1;
    });

    state.teamStats.attendanceByPlayerId = attendanceByPlayerId;
    state.teamStats.attendanceStatus = 'ready';
  } catch (error) {
    console.warn('[team-stats] attendance unavailable', error);
    state.teamStats.attendanceByPlayerId = null;
    state.teamStats.attendanceStatus = 'error';
  }

  renderTeamStatsBlock();
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

function isDebugUIEnabled() {
  const qs = new URLSearchParams(location.search);
  return qs.get('debug') === '1' || localStorage.getItem('IDV_DEBUG') === '1';
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
  if (isDebugUIEnabled()) {
    console.log('[auth-debug] session.user.id:', userId, 'profile.role:', profile.role);
  }
  refreshAdminUI();
  return profile;
}

function renderAuthDebugPanel() {
  const app = $('app');
  if (!app) return;

  const debugEnabled = isDebugUIEnabled();
  if (!debugEnabled) {
    $('authDebugPanel')?.remove();
    return;
  }

  let panel = $('authDebugPanel');
  if (!state.session?.user) {
    if (panel) panel.remove();
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
  state.teamStats = state.teamStats || { tab: 'goals', attendanceStatus: 'idle', attendanceByPlayerId: null };
  const players = getPlayers();
  if (!players.length) {
    renderTeamStatsBlock();
    $('topMvpList').innerHTML = '<li>Sin datos de MVP todavía.</li>';
    $('lineupHomeMessage').textContent = 'Alineación aún no publicada';
    if ($('lineupHomeSubmessage')) $('lineupHomeSubmessage').textContent = 'Se mostrará aquí cuando el cuerpo técnico la publique.';
    $('lineupFieldHome').classList.add('hidden');
    $('lineupFieldHome').innerHTML = '';
    $('nextMatchText').textContent = 'Sin partido próximo';
    if ($('nextMatchMeta')) $('nextMatchMeta').textContent = 'Cuando haya fecha confirmada la verás aquí.';
    $('goConfirmBtn').textContent = 'Ir a Convocatoria';
    return;
  }

  const me = getCurrentPlayer() || players[0];
  const nextMatch = getUpcomingMatch();
  const votes = getVotesTotals();
  const ranking = players
    .map((p) => ({ ...p, totalMvp: (votes[p.id] || 0) }))
    .sort((a, b) => b.totalMvp - a.totalMvp);

  renderTeamStatsBlock();
  maybeLoadTeamAttendanceTotals();

  $('nextMatchText').textContent = nextMatch ? `vs ${nextMatch.rival}` : 'Sin partido próximo';
  if ($('nextMatchMeta')) {
    $('nextMatchMeta').textContent = nextMatch
      ? `${formatDate(nextMatch.date)} · ${nextMatch.home ? 'Casa' : 'Fuera'} · ${nextMatch.venue || 'Velòdrom F7'}`
      : 'Aún no hay rival, fecha y campo cargados.';
  }

  const canConfirmNextMatch = Boolean(nextMatch && isUuid(nextMatch.id));
  const meStatus = canConfirmNextMatch && state.selectedMatchId === nextMatch.id
    ? getConvocatoriaStatusForPlayer(me.id)
    : 'pending';
  $('goConfirmBtn').textContent = !canConfirmNextMatch
    ? 'Ir a Convocatoria'
    : (meStatus === 'yes' ? 'Asistencia confirmada · Cambiar' : 'Confirmar asistencia');

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
  if ($('lineupHomeSubmessage')) $('lineupHomeSubmessage').textContent = nextMatch ? 'Solo lectura · publicación del cuerpo técnico.' : '';
  renderLineupForMatch('lineupFieldHome', 'lineupHomeMessage', nextMatch?.id || null, { emptyMessage: 'Alineación aún no publicada' });
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

  $('matchSelector').innerHTML = uuidMatches.map((m) => `<option value="${m.id}">${formatMatchLabel(m)}</option>`).join('');
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
    if (debug && isDebugUIEnabled()) {
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

    const accountHint = !userId && adminMode ? '<small>sin cuenta</small>' : '';

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
    if (isDebugUIEnabled()) {
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
        ${formatDate(m.date)} · ${m.rival} (${m.home ? 'Casa' : 'Fuera'}) · ${m.venue || 'Velòdrom F7'} · ${formatMatchResult(m)}
      </button>
      ${isPendingMatch(m) ? '<span class="badge pending">Pendiente de actualizar</span>' : ''}
    </li>
  `).join('');
}

function renderClub() {
  const matches = getMatches();
  let PJ = 0, PG = 0, PE = 0, PP = 0, GF = 0, GC = 0;

  matches.forEach((m) => {
    const [a, b] = getMatchResultTuple(m);
    if (a == null || b == null) return;
    PJ += 1;
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

  const players = getPlayers().sort((a, b) => (a.dorsal || 999) - (b.dorsal || 999));
  $('squadList').innerHTML = players.length ? players.map((p) => `
    <li class="player-card">
      <div>
        <svg class="jersey-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 10l7 6h14l7-6 8 8-8 8v30H18V26l-8-8z" fill="#4DA3FF" stroke="#13324f" stroke-width="2"/><text x="32" y="42" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">${p.dorsal || '-'}</text></svg>
      </div>
      <div>
        <div><strong>${p.name}</strong><span class="chip">${p.position || 'N/D'}</span></div>
        <div class="chips">
          <span class="chip">⚽ ${p.stats.goles || 0}</span><span class="chip">🅰️ ${p.stats.asistencias || 0}</span><span class="chip">🏆 ${p.stats.mvps || 0}</span><span class="chip">🟨 ${p.stats.amarillas || 0}</span><span class="chip">🟥 ${p.stats.rojas || 0}</span>
        </div>
      </div>
    </li>`).join('') : '<li>No hay jugadores cargados todavía.</li>';

  if (!$('clubLinksCard')) {
    const linksCard = document.createElement('article');
    linksCard.id = 'clubLinksCard';
    linksCard.className = 'card card--accent';
    linksCard.style.setProperty('--accent-color', 'var(--dorado)');
    linksCard.innerHTML = `<h2 class="section-title">Enlaces del club</h2><div class="link-actions"><button type="button" id="clubInstagramBtn" class="btn btn-secondary ext-btn ext-btn--ig" aria-label="Abrir Instagram"><span class="ext-btn__icon" aria-hidden="true">📸</span><span>Instagram</span></button><button type="button" id="clubLeagueBtn" class="btn btn-secondary ext-btn ext-btn--liga" aria-label="Abrir Liga"><span class="ext-btn__icon" aria-hidden="true">⚽</span><span>Liga (Apúntamelo)</span></button><button type="button" id="clubTableBtn" class="btn btn-gold">Ver clasificación</button></div>`;
    document.querySelector('[data-view="club"]').appendChild(linksCard);
    const url = 'https://apuntamelo.com/grupo/9/26/0/653/0/3349/0';
    $('clubInstagramBtn')?.addEventListener('click', () => window.open('https://instagram.com/interdeverdunbcn', '_blank', 'noopener'));
    $('clubLeagueBtn')?.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
    $('clubTableBtn')?.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
  }
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

  $('mvpMatchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatMatchLabel(m)}</option>`).join('');
  $('mvpMatchSelector').value = state.mvp.selectedMatchId;
  $('mvpPlayerSelector').innerHTML = players.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

  const votesForSelected = state.mvp.votesByPlayerForSelected || {};
  const ranking = players
    .map((p) => ({ ...p, total: (state.mvp.globalTotals[p.id] || 0), selectedVotes: votesForSelected[p.id] || 0 }))
    .sort((a, b) => b.total - a.total);

  $('mvpRankingList').innerHTML = ranking.map((p) => `<li>${p.name} <span class="badge">${p.total}</span> <small>(${p.selectedVotes} en partido)</small></li>`).join('');

  const debug = $('mvpDebug');
  if (debug && isDebugUIEnabled()) {
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

function hydrateLineupEditor(matchId, options = {}) {
  const force = Boolean(options.force);
  const sameMatch = state.lineupEditor.selectedMatchId === matchId;
  if (!force && sameMatch && state.lineupEditor.isDirty) return false;

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
  state.lineupEditor.isDirty = false;
  return true;
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
  state.lineupEditor.isDirty = true;
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

  const showLineupSaveError = (error) => {
    console.error('[lineups] save failed', error);
    if (isRlsPermissionError(error)) {
      showToast('Permisos insuficientes (RLS)', 'error');
      return;
    }
    showToast('No se pudo guardar la alineación. Revisa la consola (payload/columnas).', 'error');
  };

  const { error: deleteError } = await supabaseClient
    .from('lineups')
    .delete()
    .eq('match_id', matchId);

  if (deleteError) {
    showLineupSaveError(deleteError);
    console.error('[lineups] delete error', deleteError);
    return false;
  }

  const rows = Object.entries(nextAssignments || {})
    .map(([positionSlot, playerId]) => ({
      match_id: matchId,
      player_id: playerId,
      position_slot: positionSlot
    }))
    .filter((row) => isUuid(row.match_id) && isUuid(row.player_id) && String(row.position_slot || '').trim());

  if (rows.length) {
    const { error: insertError } = await supabaseClient
      .from('lineups')
      .insert(rows);

    if (insertError) {
      showLineupSaveError(insertError);
      console.error('[lineups] insert error', insertError);
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

  state.lineupEditor.isDirty = false;
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

  if (state.lineupEditor.selectedMatchId && isUuid(state.lineupEditor.selectedMatchId) && matches.some((m) => m.id === state.lineupEditor.selectedMatchId)) {
    hydrateLineupEditor(state.lineupEditor.selectedMatchId);
  } else {
    state.lineupEditor.selectedMatchId = matches[0].id;
    hydrateLineupEditor(state.lineupEditor.selectedMatchId, { force: true });
  }

  matchSelect.innerHTML = matches.map((m) => `<option value="${m.id}">${formatMatchLabel(m)}</option>`).join('');
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

  $('lineupAdminMessage').textContent = `Editando ${formatMatchShort(matches.find((m) => m.id === state.lineupEditor.selectedMatchId))}`;
  field.classList.remove('hidden');
  renderLineupField(field, state.lineupEditor.assignments, formation, {
    clickable: true,
    selectedSlot: state.lineupEditor.selectedSlot
  });
}

function renderAdmin() {
  const adminTab = document.querySelector('.admin-tab');
  const adminView = document.querySelector('[data-view="admin"]');
  const adminMode = isAdmin();
  adminTab?.classList.toggle('hidden', !adminMode);
  adminView?.classList.toggle('hidden', !adminMode);
  if (!adminMode || !adminView) return;

  const matches = getMatches();
  const players = getPlayers();
  const hasPending = state.pendingMatches.length > 0;
  const pendingPrimary = state.pendingMatches[0] || null;

  adminView.innerHTML = `<section class="admin-block admin-quick card card--accent" style="--accent-color: var(--dorado)"><h2 class="section-title">Centro de Control</h2><p class="muted">Gestión rápida de partido, stats y convocatoria.</p><div class="admin-quick-actions"><button type="button" id="quickPostBtn" class="btn btn-secondary">Ir a post-partido</button><button type="button" id="quickLineupBtn" class="btn btn-secondary">Ir a alineación</button><button type="button" id="quickImageBtn" class="btn btn-gold">Generar imagen</button><button type="button" id="quickConvBtn" class="btn btn-secondary">Ir a Convocatoria</button></div></section><section id="adminPostMatchBlock" class="admin-block admin-postmatch card ${hasPending ? 'is-pending' : ''}"><h3 class="section-title">Post-partido pendiente</h3><p class="muted">${hasPending ? `Pendiente: ${formatMatchShort(pendingPrimary)}` : 'Sin pendientes por actualizar.'}</p>${hasPending ? `<button type="button" id="adminPendingCtaBtn" class="btn btn-primary">Completar post-partido</button>` : ''}<ul id="adminPendingListAccordion" class="list"></ul></section><section id="lineupEditorSection" class="admin-block admin-lineup card" open><h3 class="section-title">Alineación por partido</h3><label for="lineupMatchSelector">Partido</label><select id="lineupMatchSelector" class="input"></select><div id="lineupFormationToggle" class="formation-toggle"><button type="button" data-action="set-formation" data-formation="1-2-3-1">1-2-3-1</button><button type="button" data-action="set-formation" data-formation="1-3-2-1">1-3-2-1</button></div><p id="lineupAdminMessage" class="lineup-message"></p><div id="lineupFieldAdmin" class="lineup-field hidden"></div><label for="lineupSlotSelector">Slot</label><select id="lineupSlotSelector" class="input"></select><label for="lineupPlayerSelectorForSlot">Jugador</label><select id="lineupPlayerSelectorForSlot" class="input"></select><button id="saveLineupBtn" type="button" class="btn btn-primary">Guardar alineación</button></section><section class="admin-block admin-tools"><details class="card" open><summary>Resultados</summary><form id="resultForm"><select id="adminMatchSelector" class="input"></select><input id="adminResult" class="input" placeholder="Ej: 2-1 o -" required /><button type="submit" class="btn btn-primary">Guardar resultado</button></form></details><details class="card"><summary>Stats</summary><form id="playerStatsForm"><select id="adminPlayerSelector" class="input"></select><input id="sGoles" class="input" type="number" min="0" placeholder="Goles" required /><input id="sAsist" class="input" type="number" min="0" placeholder="Asistencias" required /><input id="sAma" class="input" type="number" min="0" placeholder="Amarillas" required /><input id="sRojas" class="input" type="number" min="0" placeholder="Rojas" required /><input id="sMvps" class="input" type="number" min="0" placeholder="MVPs base" required /><button type="submit" class="btn btn-primary">Guardar stats</button></form></details><details class="card"><summary>Imagen convocatoria</summary><button id="adminImageBtn" class="btn btn-gold">Generar imagen convocatoria</button></details></section>`;
  $('adminMatchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatMatchLabel(m)}</option>`).join('');
  $('adminPlayerSelector').innerHTML = players.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  $('adminPendingListAccordion').innerHTML = state.pendingMatches.length ? state.pendingMatches.map((m) => `<li><button class="btn btn-secondary" type="button" data-action="admin-open-postmatch" data-id="${m.id}">${formatMatchShort(m)}</button></li>`).join('') : '<li class="muted">Sin pendientes.</li>';
  $('quickPostBtn')?.addEventListener('click', () => state.pendingMatches[0] && openPostMatchModal(state.pendingMatches[0].id));
  $('adminPendingCtaBtn')?.addEventListener('click', () => state.pendingMatches[0] && openPostMatchModal(state.pendingMatches[0].id));
  $('quickLineupBtn')?.addEventListener('click', () => {
    const pendingSelected = state.postMatchEditor?.matchId;
    const preferredMatchId = isUuid(pendingSelected)
      ? pendingSelected
      : (isUuid(state.lineupEditor.selectedMatchId) ? state.lineupEditor.selectedMatchId : null);
    if (preferredMatchId) {
      state.lineupEditor.selectedMatchId = preferredMatchId;
      hydrateLineupEditor(preferredMatchId, { force: true });
    }
    window.location.hash = '#admin';
    renderAdmin();
    route();
    requestAnimationFrame(() => (document.querySelector('#lineupEditorSection') || document.querySelector('#lineupFieldAdmin'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
  $('quickImageBtn')?.addEventListener('click', () => document.getElementById('adminImageBtn')?.click());
  $('quickConvBtn')?.addEventListener('click', () => window.location.hash = '#convocatoria');
  $('lineupMatchSelector')?.addEventListener('change', (e) => { hydrateLineupEditor(e.target.value, { force: true }); renderLineupEditor(); });
  $('lineupSlotSelector')?.addEventListener('change', (e) => { state.lineupEditor.selectedSlot = e.target.value; renderLineupEditor(); });
  $('lineupPlayerSelectorForSlot')?.addEventListener('change', (e) => { assignLineupPlayer(state.lineupEditor.selectedSlot, e.target.value); renderLineupEditor(); });
  $('saveLineupBtn')?.addEventListener('click', async () => { const matchId = state.lineupEditor.selectedMatchId; const formation = state.lineupEditor.formation; const assignments = normalizeAssignmentsForFormation(state.lineupEditor.assignments, formation); const ok = await saveLineupForMatch(matchId, assignments); if (!ok) return; hydrateLineupEditor(matchId, { force: true }); renderLineupEditor(); renderHome(); showToast('Alineación guardada', 'success'); });
  const adminImageBtn = $('adminImageBtn');
  if (adminImageBtn) {
    adminImageBtn.onclick = () => {
      const id = state.selectedMatchId || getUpcomingMatch?.()?.id;
      if (!id) return showToastOrAlert('No hay partido seleccionado ni próximo partido disponible', 'error');
      generateInstagramPoster(id);
    };
  }
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

function isAutoRefreshBlocked() {
  const currentView = window.location.hash.replace('#', '') || 'home';
  if (currentView === 'admin') return true;
  if (document.querySelector('dialog[open]')) return true;

  const active = document.activeElement;
  const typingTag = active?.tagName;
  if (active && (typingTag === 'INPUT' || typingTag === 'TEXTAREA' || typingTag === 'SELECT' || active.isContentEditable)) {
    return true;
  }

  return false;
}

async function refreshSessionData(options = {}) {
  const {
    source = 'manual',
    showSuccessToast = true,
    useRefreshButton = false
  } = options;

  if (refreshInFlight) return false;
  if (!state.session?.user) return false;

  const button = useRefreshButton ? $('homeRefreshBtn') : null;
  const previousLabel = button?.textContent;

  refreshInFlight = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Actualizando...';
  }

  try {
    state.teamStats = state.teamStats || { tab: 'goals', attendanceStatus: 'idle', attendanceByPlayerId: null };
    state.teamStats.attendanceStatus = 'idle';
    state.teamStats.attendanceByPlayerId = null;

    await hydrateSessionData();
    renderAll();
    if (showSuccessToast) showToast('Datos actualizados', 'success');
    return true;
  } catch (error) {
    console.error(`[home-refresh:${source}] error`, error);
    showToast(error.message || 'No se pudieron actualizar los datos', 'error');
    return false;
  } finally {
    refreshInFlight = false;
    if (button) {
      button.disabled = false;
      button.textContent = previousLabel || 'Actualizar datos';
    }
  }
}

function scheduleAutoRefreshOnForeground(source = 'foreground') {
  if (document.hidden) return;
  if (!state.session?.user) return;
  if (isAutoRefreshBlocked()) return;

  const now = Date.now();
  if ((now - lastAutoRefreshAt) < AUTO_REFRESH_COOLDOWN_MS) return;
  lastAutoRefreshAt = now;

  refreshSessionData({ source, showSuccessToast: false, useRefreshButton: false });
}

async function refreshHomeDataManually() {
  const button = $('homeRefreshBtn');
  if (!button || button.disabled) return;
  await refreshSessionData({ source: 'manual', showSuccessToast: true, useRefreshButton: true });
}

function showToast(text, type = "info") {
  const t = $('toast');
  t.textContent = text;
  t.dataset.type = type;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

function showToastOrAlert(text, type = 'info') {
  if ($('toast')) {
    showToast(text, type);
    return;
  }
  alert(text);
}

function isRlsPermissionError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function generateInstagramPoster(matchId) {
  const match = getMatches().find((m) => m.id === matchId);
  if (!match) {
    showToastOrAlert('Selecciona un partido para generar el cartel', 'error');
    return;
  }

  let attendanceRows = [];
  let lineupRows = [];
  let profileRows = [];
  try {
    if (supabaseClient && isUuid(matchId)) {
      const [attendanceRes, lineupsRes] = await Promise.all([
        supabaseClient.from('attendance').select('user_id,status').eq('match_id', matchId),
        supabaseClient.from('lineups').select('player_id,position_slot').eq('match_id', matchId)
      ]);
      attendanceRows = attendanceRes?.data || [];
      lineupRows = lineupsRes?.data || [];
      const userIds = [...new Set((attendanceRows || []).map((row) => row?.user_id).filter(Boolean))];
      if (userIds.length) {
        const profilesRes = await supabaseClient.from('profiles').select('id,player_id').in('id', userIds);
        profileRows = profilesRes?.data || [];
      }
    }
  } catch (error) {
    console.warn('[poster] fallback local data', error);
  }

  if (!lineupRows.length && state.lineupsByMatch?.[matchId]) {
    lineupRows = Object.entries(state.lineupsByMatch[matchId]).map(([position_slot, player_id]) => ({ position_slot, player_id }));
  }

  const playersById = Object.fromEntries(getPlayers().map((p) => [p.id, p]));
  const profileToPlayer = Object.fromEntries((profileRows || []).map((row) => [String(row.id), String(row.player_id)]));
  const confirmedPlayerIds = (attendanceRows || [])
    .filter((row) => normalizeAttendanceStatus(row?.status) === 'yes')
    .map((row) => profileToPlayer[String(row.user_id)])
    .filter(Boolean);

  const lineupPlayerIds = (lineupRows || [])
    .filter((row) => row?.player_id)
    .map((row) => String(row.player_id));

  const shouldFallbackToLineup = confirmedPlayerIds.length === 0 || (attendanceRows || []).length < 5;
  const convocadosIds = [...new Set(shouldFallbackToLineup ? [...confirmedPlayerIds, ...lineupPlayerIds] : confirmedPlayerIds)];

  const sortableText = (value) => String(value || '').toLocaleLowerCase('es');
  const shortPlayerName = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Jugador';
    if (parts.length === 1) return parts[0].slice(0, 16);
    return `${parts[0]} ${parts[parts.length - 1]}`.slice(0, 18);
  };

  const convocados = convocadosIds
    .map((id) => playersById[String(id)])
    .filter(Boolean)
    .sort((a, b) => {
      const dorsalA = Number(a?.dorsal);
      const dorsalB = Number(b?.dorsal);
      const hasDorsalA = Number.isFinite(dorsalA) && dorsalA > 0;
      const hasDorsalB = Number.isFinite(dorsalB) && dorsalB > 0;
      if (hasDorsalA && hasDorsalB) return dorsalA - dorsalB;
      if (hasDorsalA && !hasDorsalB) return -1;
      if (!hasDorsalA && hasDorsalB) return 1;
      return sortableText(a?.name).localeCompare(sortableText(b?.name), 'es');
    });

  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const dateObj = match.date ? new Date(match.date) : new Date();
  const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });
  const formattedTime = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const opponent = match.rival || 'Rival por confirmar';
  const venue = match.venue || 'Velòdrom F7';

  let bgImg = null;
  let crestImg = null;
  let imageLoadFailed = false;
  try {
    bgImg = await loadImage('fondo.svg');
  } catch (error) {
    imageLoadFailed = true;
    console.warn('[poster] no se pudo cargar fondo.svg', error);
  }
  try {
    crestImg = await loadImage('escudo.png');
  } catch (error) {
    imageLoadFailed = true;
    console.warn('[poster] no se pudo cargar escudo.png', error);
  }

  ctx.fillStyle = '#f6f9fc';
  ctx.fillRect(0, 0, 1080, 1350);
  if (bgImg) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.drawImage(bgImg, 0, 0, 1080, 1350);
    ctx.restore();
  }

  if (crestImg) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.drawImage(crestImg, 690, 750, 320, 320);
    ctx.restore();
  }

  drawRoundedRect(ctx, 56, 48, 968, 560, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(13, 33, 56, 0.08)';
  ctx.shadowBlur = 30;
  ctx.strokeStyle = 'rgba(19, 50, 79, 0.08)';
  ctx.stroke();
  ctx.restore();

  if (crestImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(19,50,79,0.15)';
    ctx.shadowBlur = 16;
    ctx.drawImage(crestImg, 90, 82, 132, 132);
    ctx.restore();
  }

  ctx.fillStyle = '#10283f';
  ctx.font = '700 66px Arial';
  ctx.fillText('CONVOCATORIA', 250, 145);
  ctx.font = '600 34px Arial';
  ctx.fillStyle = '#1e4e74';
  ctx.fillText('EL INTER DE VERDUN', 250, 188);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(250, 214, 700, 3);

  ctx.fillStyle = '#0f2c46';
  ctx.textAlign = 'center';
  ctx.font = '800 82px Arial';
  ctx.fillText(`VS ${String(opponent).toUpperCase()}`, 540, 335);
  ctx.font = '600 38px Arial';
  ctx.fillStyle = '#1a4265';
  ctx.fillText(formattedDate, 540, 395);
  ctx.font = '700 40px Arial';
  ctx.fillStyle = '#113756';
  ctx.fillText(`${formattedTime}h`, 540, 447);

  const chips = [
    { text: match.home ? 'CASA' : 'FUERA', x: 356, w: 170 },
    { text: venue, x: 540, w: 380 }
  ];
  chips.forEach((chip) => {
    drawRoundedRect(ctx, chip.x, 482, chip.w, 56, 24);
    ctx.fillStyle = '#e1f2ff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 79, 118, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#15476a';
    ctx.font = chip.w < 220 ? '700 30px Arial' : '600 26px Arial';
    ctx.fillText(chip.text, chip.x + chip.w / 2, 518);
  });

  drawRoundedRect(ctx, 56, 630, 968, 560, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(19, 50, 79, 0.08)';
  ctx.stroke();

  ctx.textAlign = 'start';
  drawRoundedRect(ctx, 86, 666, 298, 478, 24);
  ctx.fillStyle = '#f2f8ff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(19, 50, 79, 0.12)';
  ctx.stroke();

  ctx.fillStyle = '#113756';
  ctx.font = '700 42px Arial';
  ctx.fillText('Convocados', 112, 722);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(112, 738, 190, 3);

  const maxConvocados = 15;
  const visibleConvocados = convocados.slice(0, maxConvocados);
  if (!visibleConvocados.length) {
    ctx.fillStyle = '#355b78';
    ctx.font = '500 27px Arial';
    ctx.fillText('Sin confirmaciones aún', 112, 790);
  } else {
    visibleConvocados.forEach((player, index) => {
      const y = 792 + index * 23;
      const dorsal = Number(player?.dorsal);
      const hasDorsal = Number.isFinite(dorsal) && dorsal > 0;
      ctx.fillStyle = '#163f60';
      ctx.font = hasDorsal ? '700 23px Arial' : '500 23px Arial';
      const label = hasDorsal ? `${dorsal}. ${shortPlayerName(player?.name)}` : shortPlayerName(player?.name);
      ctx.fillText(label, 112, y);
    });
    if (convocados.length > maxConvocados) {
      ctx.fillStyle = '#5c7890';
      ctx.font = '500 19px Arial';
      ctx.fillText(`+${convocados.length - maxConvocados} más`, 112, 1140);
    }
  }

  drawRoundedRect(ctx, 408, 666, 592, 478, 24);
  ctx.fillStyle = '#347a51';
  ctx.fill();
  const turfGradient = ctx.createLinearGradient(408, 666, 1000, 1144);
  turfGradient.addColorStop(0, 'rgba(255,255,255,0.11)');
  turfGradient.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = turfGradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(438, 694, 532, 420);
  ctx.beginPath();
  ctx.moveTo(704, 694);
  ctx.lineTo(704, 1114);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(704, 904, 48, 0, Math.PI * 2);
  ctx.stroke();

  const drawLineupPlate = (x, y, player, index) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 8;
    drawRoundedRect(ctx, x - 54, y - 26, 108, 52, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    const dorsal = Number(player?.dorsal);
    const hasDorsal = Number.isFinite(dorsal) && dorsal > 0;
    ctx.fillStyle = '#123957';
    ctx.font = '700 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(hasDorsal ? `#${dorsal}` : `#${index + 1}`, x, y - 4);
    ctx.font = '500 15px Arial';
    ctx.fillStyle = '#2b5878';
    ctx.fillText(shortPlayerName(player?.name || ''), x, y + 15);
  };

  if (lineupRows?.length) {
    const slotCoords = {
      GK: [704, 1084],
      D1: [562, 986],
      D2: [704, 974],
      D3: [848, 986],
      M1: [532, 868],
      M2: [704, 850],
      M3: [876, 868],
      F1: [704, 748]
    };
    const normalizedRows = lineupRows
      .filter((row) => row?.position_slot && row?.player_id)
      .sort((a, b) => String(a.position_slot).localeCompare(String(b.position_slot)));

    normalizedRows.slice(0, 8).forEach((slot, i) => {
      const p = playersById[String(slot.player_id)];
      const [x, y] = slotCoords[String(slot.position_slot)] || [704, 904];
      drawLineupPlate(x, y, p, i);
    });
    ctx.textAlign = 'start';
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 38px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Alineación por confirmar', 704, 924);
    ctx.textAlign = 'start';
  }

  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(80, 1248, 920, 3);
  ctx.fillStyle = '#13324f';
  ctx.font = '600 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('@interdeverdunbcn   #InterDeVerdun', 540, 1298);
  ctx.textAlign = 'start';

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const datePart = new Date(match.date || Date.now()).toISOString().slice(0, 10);
  link.href = url;
  const rivalPart = String(match.rival || 'rival').normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').toLowerCase() || 'rival';
  link.download = `convocatoria_${datePart}_${rivalPart}.png`;
  link.click();
  URL.revokeObjectURL(url);

  if (imageLoadFailed) {
    showToastOrAlert('Cartel generado sin algunos recursos visuales (fondo/escudo).', 'error');
  }
}

function clampStatValue(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function ensureDraftForPlayer(playerId) {
  const d = state.postMatchEditor.playerStatsDraft || (state.postMatchEditor.playerStatsDraft = {});
  if (!d[playerId]) d[playerId] = { goals: 0, assists: 0, yc: 0, rc: 0, mvps: 0 };
  return d[playerId];
}

function buildPlayerStatsDraftFromCurrentPlayers() {
  const players = getPlayers();
  return Object.fromEntries(players.map((p) => [p.id, {
    goals: Number(p.stats.goles || 0),
    assists: Number(p.stats.asistencias || 0),
    yc: Number(p.stats.amarillas || 0),
    rc: Number(p.stats.rojas || 0),
    mvps: Number(p.stats.mvps || 0)
  }]));
}

function isDraftEdited(d) {
  return (d.goals || 0) !== 0 || (d.assists || 0) !== 0 || (d.yc || 0) !== 0 || (d.rc || 0) !== 0 || (d.mvps || 0) !== 0;
}

function renderPostMatchPlayersList() {
  const container = $('postPlayersList');
  if (!container) return;

  const players = getPlayers();
  if (!players.length) {
    container.innerHTML = "<p class='muted'>No hay jugadores para editar.</p>";
    return;
  }

  if (!state.postMatchEditor.playerStatsDraft || !Object.keys(state.postMatchEditor.playerStatsDraft).length) {
    state.postMatchEditor.playerStatsDraft = buildPlayerStatsDraftFromCurrentPlayers();
  }

  if (!state.postMatchEditor.ui) state.postMatchEditor.ui = { q: '', onlyEdited: false };
  const q = String(state.postMatchEditor.ui.q || '').trim().toLowerCase();
  const onlyEdited = Boolean(state.postMatchEditor.ui.onlyEdited);
  const filteredPlayers = players.filter((p) => {
    const draft = ensureDraftForPlayer(p.id);
    const byQuery = !q || String(p.name || '').toLowerCase().includes(q);
    const byEdited = !onlyEdited || isDraftEdited(draft);
    return byQuery && byEdited;
  });

  if (!filteredPlayers.length) {
    container.innerHTML = "<p class='muted'>No hay jugadores para este filtro.</p>";
    return;
  }

  container.innerHTML = `<div class="pm-list">${filteredPlayers.map((p) => {
    const d = ensureDraftForPlayer(p.id);
    const edited = isDraftEdited(d);
    return `<div class="pm-card" data-player-id="${p.id}">
      <div class="pm-card-top">
        <div class="pm-name">#${p.dorsal || '-'} ${p.name}</div>
        <div class="pm-edited" style="display:${edited ? 'inline-flex' : 'none'}">Editado</div>
      </div>
      <div class="pm-controls">
        <div class="pm-ctrl">
          <label>Goles</label>
          <div class="pm-stepper" data-stat="goals">
            <button type="button" data-action="dec">−</button>
            <input inputmode="numeric" pattern="[0-9]*" value="${clampStatValue(d.goals)}" data-field="goals">
            <button type="button" data-action="inc">+</button>
          </div>
        </div>

        <div class="pm-ctrl">
          <label>Asist.</label>
          <div class="pm-stepper" data-stat="assists">
            <button type="button" data-action="dec">−</button>
            <input inputmode="numeric" pattern="[0-9]*" value="${clampStatValue(d.assists)}" data-field="assists">
            <button type="button" data-action="inc">+</button>
          </div>
        </div>

        <div class="pm-ctrl">
          <label>Tarjetas</label>
          <div class="pm-toggle">
            <button type="button" class="pm-yellow ${d.yc ? 'is-on' : ''}" data-toggle="yc">🟨</button>
            <button type="button" class="${d.rc ? 'is-on' : ''}" data-toggle="rc">🟥</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function openPostMatchModal(matchId) {
  if (!isAdmin()) {
    showToast('Solo admin', 'error');
    return;
  }
  const match = getMatches().find((m) => m.id === matchId);
  if (!match) {
    showToast('Partido no encontrado', 'error');
    return;
  }
  state.postMatchEditor.open = true;
  state.postMatchEditor.matchId = matchId;
  const cachedDraft = state.postMatchEditor.draftsByMatch?.[matchId];
  state.postMatchEditor.playerStatsDraft = cachedDraft
    ? JSON.parse(JSON.stringify(cachedDraft))
    : buildPlayerStatsDraftFromCurrentPlayers();
  if (!state.postMatchEditor.draftsByMatch) state.postMatchEditor.draftsByMatch = {};
  state.postMatchEditor.draftsByMatch[matchId] = JSON.parse(JSON.stringify(state.postMatchEditor.playerStatsDraft));
  state.postMatchEditor.ui = { q: '', onlyEdited: false };

  let homeVal = '';
  let awayVal = '';
  const [homeGoals, awayGoals] = getMatchResultTuple(match);
  if (homeGoals != null && awayGoals != null) {
    homeVal = homeGoals;
    awayVal = awayGoals;
  }

  if ($('postMatchTitle')) $('postMatchTitle').textContent = `Post-partido · ${match.rival}`;
  if ($('postResultHome')) $('postResultHome').value = homeVal;
  if ($('postResultAway')) $('postResultAway').value = awayVal;
  if ($('postPlayersSearch')) $('postPlayersSearch').value = '';
  if ($('postFilterEditedBtn')) $('postFilterEditedBtn').textContent = 'Solo editados: NO';

  renderPostMatchPlayersList();
  if (!getPlayers().length && $('postPlayersList')) {
    $('postPlayersList').innerHTML = "<p class='muted'>No hay jugadores cargados</p>";
  }

  const dlg = $('postMatchModal');
  dlg?.showModal();
  requestAnimationFrame(() => {
    try { dlg.scrollTop = 0; } catch {}
    try { $('postPlayersList').scrollTop = 0; } catch {}
  });
}

async function savePostMatchModal() {
  if (!isAdmin()) {
    showToast('Solo admin', 'error');
    return;
  }
  const matchId = state.postMatchEditor.matchId;
  const result_home = parseInt($('postResultHome').value, 10);
  const result_away = parseInt($('postResultAway').value, 10);

  if (Number.isNaN(result_home) || Number.isNaN(result_away) || result_home < 0 || result_away < 0) {
    showToast('Resultado inválido', 'error');
    return;
  }

  const payload = { [MATCH_RESULT_COLS.home]: result_home, [MATCH_RESULT_COLS.away]: result_away };
  console.log('[post-match] saving match result', { matchId, payload });
  const { error: matchError } = await supabaseClient
    .from('matches')
    .update(payload)
    .eq('id', matchId);
  if (matchError) {
    console.error('[post-match] match update error', { matchId, payload, error: matchError });
    showToast(matchError.message || 'Error guardando resultado', 'error');
    return;
  }

  clearMatchResultOverride(matchId);
  const idx = state.data.matches.findIndex((m) => m.id === matchId);
  if (idx >= 0) {
    state.data.matches[idx] = mapMatchRow({ ...state.data.matches[idx], ...payload });
  }
  await refreshPostMatchState();
  renderHome();

  const updates = Object.entries(state.postMatchEditor.playerStatsDraft).map(([playerId, d]) => (
    supabaseClient.from('players').update({ goals: Number(d.goals), assists: Number(d.assists), yc: Number(d.yc), rc: Number(d.rc), mvps: Number(d.mvps) }).eq('id', playerId)
  ));
  console.log('[post-match] saving player stats', { matchId, players: updates.length });
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error('[post-match] player stats update error', { matchId, error: failed.error });
    showToast(failed.error.message || 'Error guardando stats', 'error');
    return;
  }

  if (state.postMatchEditor.draftsByMatch) delete state.postMatchEditor.draftsByMatch[matchId];
  $('postMatchModal').close();
  await hydrateSessionData();
  renderAll();
  showToast('Post-partido actualizado', 'success');
}

function openAdminLineupForMatch(matchId) {
  if (!isAdmin()) return showToast('Solo admin', 'error');
  if (!isUuid(matchId)) return showToast('Este partido no es UUID', 'error');
  state.lineupEditor.selectedMatchId = matchId;
  hydrateLineupEditor(matchId);
  window.location.hash = '#admin';
  renderAdmin();
  route();
  requestAnimationFrame(() => document.getElementById('lineupFieldAdmin')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
}

function openMatchModal(matchId) {
  const m = getMatches().find((x) => x.id === matchId);
  if (!m) return;
  $('modalTitle').textContent = `${m.rival} · ${formatDate(m.date)}`;
  $('modalDetail').innerHTML = `Localía: ${m.home ? 'Casa' : 'Fuera'} · Campo: ${m.venue || 'Velòdrom F7'} · Resultado: ${formatMatchResult(m)} ${isPendingMatch(m) ? '<span class="badge pending">Pendiente de actualizar</span>' : ''}`;
  renderLineupForMatch('lineupFieldModal', 'lineupModalMessage', m.id);

  const adminZone = $('modalAdminEdit');
  const adminMode = isAdmin();
  adminZone.classList.toggle('hidden', !adminMode);
  $('openPostMatchFromModalBtn').onclick = () => openPostMatchModal(m.id);
  $('openLineupEditorFromModalBtn').onclick = () => openAdminLineupForMatch(m.id);

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
  $('signupBtn')?.classList.toggle('hidden', !isDebugUIEnabled());
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').textContent = '';

    const creds = buildAuthCredentials();
    if (!creds.email || !creds.password) {
      $('loginError').textContent = 'Indica nombre/email y contraseña.';
      return;
    }

    const submitBtn = $('loginSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';
    const { error } = await supabaseClient.auth.signInWithPassword(creds);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
    if (error) {
      $('loginError').textContent = error.message || 'Credenciales incorrectas.';
      return;
    }

    await syncSession();
  });

  $('signupBtn')?.addEventListener('click', async () => {
    $('loginError').textContent = '';
    const creds = buildAuthCredentials();
    if (!creds.email || !creds.password) {
      $('loginError').textContent = 'Indica nombre/email y contraseña.';
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
    const nextMatchId = getUpcomingMatch()?.id;
    if (isUuid(nextMatchId)) state.selectedMatchId = nextMatchId;
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

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'homeRefreshBtn') {
      console.log('[refresh] botón pulsado');
      await refreshHomeDataManually();
      return;
    }

    if (btn.dataset.action === 'team-stats-tab') {
      state.teamStats = state.teamStats || { tab: 'goals', attendanceStatus: 'idle', attendanceByPlayerId: null };
      state.teamStats.tab = btn.dataset.tab || 'goals';
      renderTeamStatsBlock();
      return;
    }

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
      state.lineupEditor.isDirty = true;
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
      return;
    }

    if (btn.dataset.action === 'admin-open-postmatch') {
      openPostMatchModal(btn.dataset.id);
      return;
    }
  });

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

  document.addEventListener('submit', (e) => {
    if (e.target?.id === 'resultForm') {
      e.preventDefault();
      const id = $('adminMatchSelector')?.value;
      const raw = $('adminResult')?.value?.trim() || '-';
      if (isUuid(id) && supabaseClient && isAdmin()) {
        const parsed = parseResult(raw);
        if (!parsed) {
          showToast('Resultado inválido', 'error');
          return;
        }
        const [homeGoals, awayGoals] = parsed;
        supabaseClient.from('matches').update({ [MATCH_RESULT_COLS.home]: homeGoals, [MATCH_RESULT_COLS.away]: awayGoals }).eq('id', id)
          .then(async ({ error }) => {
            if (error) {
              showToast(error.message || 'Error guardando resultado', 'error');
              return;
            }
            clearMatchResultOverride(id);
            await hydrateSessionData();
            renderAll();
            showToast('Resultado guardado', 'success');
          });
        return;
      }
      const o = readJSON('matchResultsOverride', {});
      o[id] = raw;
      writeJSON('matchResultsOverride', o);
      renderAll();
      showToast('Resultado guardado');
    }
    if (e.target?.id === 'playerStatsForm') {
      e.preventDefault();
      const id = $('adminPlayerSelector')?.value;
      const nextStats = {
        goles: Number($('sGoles')?.value || 0),
        asistencias: Number($('sAsist')?.value || 0),
        amarillas: Number($('sAma')?.value || 0),
        rojas: Number($('sRojas')?.value || 0),
        mvps: Number($('sMvps')?.value || 0)
      };

      if (isUuid(id) && supabaseClient && isAdmin()) {
        supabaseClient
          .from('players')
          .update({ goals: nextStats.goles, assists: nextStats.asistencias, yc: nextStats.amarillas, rc: nextStats.rojas, mvps: nextStats.mvps })
          .eq('id', id)
          .then(async ({ error }) => {
            if (error) {
              showToast(error.message || 'Error guardando stats', 'error');
              return;
            }
            clearPlayerStatsOverride(id);
            await hydrateSessionData();
            renderAll();
            showToast('Stats actualizadas', 'success');
          });
        return;
      }

      const o = readJSON('playerStatsOverride', {});
      o[id] = nextStats;
      writeJSON('playerStatsOverride', o);
      renderAll();
      showToast('Stats actualizadas');
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target?.id !== 'adminPlayerSelector') return;
    const p = getPlayers().find((x) => x.id === e.target.value);
    if (!p) return;
    if ($('sGoles')) $('sGoles').value = p.stats.goles;
    if ($('sAsist')) $('sAsist').value = p.stats.asistencias;
    if ($('sAma')) $('sAma').value = p.stats.amarillas;
    if ($('sRojas')) $('sRojas').value = p.stats.rojas;
    if ($('sMvps')) $('sMvps').value = p.stats.mvps;
  });

  $('closeModalBtn')?.addEventListener('click', () => $('matchModal')?.close());
  $('savePostMatchBtn')?.addEventListener('click', savePostMatchModal);
  $('closePostMatchBtn')?.addEventListener('click', () => $('postMatchModal')?.close());
  $('postPlayersSearch')?.addEventListener('input', (e) => {
    if (!state.postMatchEditor.ui) state.postMatchEditor.ui = { q: '', onlyEdited: false };
    state.postMatchEditor.ui.q = e.target.value || '';
    renderPostMatchPlayersList();
  });

  $('postFilterEditedBtn')?.addEventListener('click', () => {
    if (!state.postMatchEditor.ui) state.postMatchEditor.ui = { q: '', onlyEdited: false };
    state.postMatchEditor.ui.onlyEdited = !state.postMatchEditor.ui.onlyEdited;
    $('postFilterEditedBtn').textContent = `Solo editados: ${state.postMatchEditor.ui.onlyEdited ? 'SÍ' : 'NO'}`;
    renderPostMatchPlayersList();
  });

  $('postResetDraftBtn')?.addEventListener('click', () => {
    state.postMatchEditor.playerStatsDraft = buildPlayerStatsDraftFromCurrentPlayers();
    const activeMatchId = state.postMatchEditor.matchId;
    if (activeMatchId) {
      if (!state.postMatchEditor.draftsByMatch) state.postMatchEditor.draftsByMatch = {};
      state.postMatchEditor.draftsByMatch[activeMatchId] = JSON.parse(JSON.stringify(state.postMatchEditor.playerStatsDraft));
    }
    renderPostMatchPlayersList();
  });

  function syncPostEditedBadge(card, draft) {
    const badge = card?.querySelector('.pm-edited');
    if (badge) badge.style.display = isDraftEdited(draft) ? 'inline-flex' : 'none';
  }

  $('postPlayersList')?.addEventListener('input', (e) => {
    const input = e.target.closest('input[data-field]');
    if (!input) return;
    const card = input.closest('[data-player-id]');
    const pid = card?.dataset.playerId;
    const key = input.dataset.field;
    if (!pid || !key) return;
    const draft = ensureDraftForPlayer(pid);
    draft[key] = clampStatValue(parseInt(input.value, 10));
    input.value = String(draft[key]);
    const activeMatchId = state.postMatchEditor.matchId;
    if (activeMatchId) {
      if (!state.postMatchEditor.draftsByMatch) state.postMatchEditor.draftsByMatch = {};
      state.postMatchEditor.draftsByMatch[activeMatchId] = JSON.parse(JSON.stringify(state.postMatchEditor.playerStatsDraft));
    }
    syncPostEditedBadge(card, draft);
  });

  $('postPlayersList')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-player-id]');
    if (!card) return;
    const pid = card.dataset.playerId;
    if (!pid) return;
    const draft = ensureDraftForPlayer(pid);

    const stepBtn = e.target.closest('button[data-action]');
    if (stepBtn) {
      const stepper = stepBtn.closest('.pm-stepper');
      const stat = stepper?.dataset.stat;
      const action = stepBtn.dataset.action;
      if (!stat || !['goals', 'assists'].includes(stat)) return;
      const delta = action === 'inc' ? 1 : -1;
      draft[stat] = clampStatValue(Number(draft[stat] || 0) + delta);
      const input = stepper.querySelector(`input[data-field="${stat}"]`);
      if (input) input.value = String(draft[stat]);
      const activeMatchId = state.postMatchEditor.matchId;
      if (activeMatchId) {
        if (!state.postMatchEditor.draftsByMatch) state.postMatchEditor.draftsByMatch = {};
        state.postMatchEditor.draftsByMatch[activeMatchId] = JSON.parse(JSON.stringify(state.postMatchEditor.playerStatsDraft));
      }
      syncPostEditedBadge(card, draft);
      return;
    }

    const toggleBtn = e.target.closest('button[data-toggle]');
    if (toggleBtn) {
      const key = toggleBtn.dataset.toggle;
      if (!['yc', 'rc'].includes(key)) return;
      draft[key] = draft[key] ? 0 : 1;
      toggleBtn.classList.toggle('is-on', Boolean(draft[key]));
      const activeMatchId = state.postMatchEditor.matchId;
      if (activeMatchId) {
        if (!state.postMatchEditor.draftsByMatch) state.postMatchEditor.draftsByMatch = {};
        state.postMatchEditor.draftsByMatch[activeMatchId] = JSON.parse(JSON.stringify(state.postMatchEditor.playerStatsDraft));
      }
      syncPostEditedBadge(card, draft);
    }
  });

  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleAutoRefreshOnForeground('visibilitychange');
  });
  window.addEventListener('focus', () => scheduleAutoRefreshOnForeground('focus'));
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
