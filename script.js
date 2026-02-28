const FALLBACK_DATA = {
  players: [
    { id: 'p1', name: 'plans', position: 'DEF', dorsal: 1, stats: { goles: 0, asistencias: 0, amarillas: 0, rojas: 0, mvps: 0 } },
    { id: 'p2', name: 'pomares', position: 'DEF', dorsal: 2, stats: { goles: 1, asistencias: 1, amarillas: 1, rojas: 0, mvps: 0 } },
    { id: 'p3', name: 'porras', position: 'DEL', dorsal: 4, stats: { goles: 8, asistencias: 2, amarillas: 2, rojas: 0, mvps: 3 } },
    { id: 'p4', name: 'cuco', position: 'DEF', dorsal: 5, stats: { goles: 0, asistencias: 1, amarillas: 1, rojas: 0, mvps: 0 } },
    { id: 'p5', name: 'altimira', position: 'MED', dorsal: 7, stats: { goles: 2, asistencias: 3, amarillas: 1, rojas: 0, mvps: 1 } },
    { id: 'p6', name: 'alex', position: 'DEL', dorsal: 9, stats: { goles: 5, asistencias: 1, amarillas: 0, rojas: 0, mvps: 2 } },
    { id: 'p7', name: 'dani', position: 'MED', dorsal: 10, stats: { goles: 4, asistencias: 2, amarillas: 1, rojas: 0, mvps: 1 } },
    { id: 'p8', name: 'delrio', position: 'DEL', dorsal: 11, stats: { goles: 3, asistencias: 1, amarillas: 0, rojas: 0, mvps: 1 } },
    { id: 'p9', name: 'peke', position: 'MED', dorsal: 17, stats: { goles: 1, asistencias: 2, amarillas: 1, rojas: 0, mvps: 0 } },
    { id: 'p10', name: 'sergio', position: 'DEF', dorsal: 19, stats: { goles: 1, asistencias: 1, amarillas: 1, rojas: 0, mvps: 0 } },
    { id: 'p11', name: 'rony', position: 'DEL', dorsal: 23, stats: { goles: 2, asistencias: 1, amarillas: 0, rojas: 0, mvps: 0 } },
    { id: 'p12', name: 'malle', position: 'POR', dorsal: 30, stats: { goles: 0, asistencias: 0, amarillas: 0, rojas: 0, mvps: 1 } },
    { id: 'p13', name: 'edgar', position: 'DEF', dorsal: 44, stats: { goles: 0, asistencias: 1, amarillas: 0, rojas: 0, mvps: 0 } },
    { id: 'p14', name: 'joeliko', position: 'MED', dorsal: 69, stats: { goles: 1, asistencias: 1, amarillas: 1, rojas: 0, mvps: 0 } },
    { id: 'p15', name: 'mordillo', position: 'POR', dorsal: 99, stats: { goles: 0, asistencias: 0, amarillas: 0, rojas: 0, mvps: 0 } }
  ],
  matches: [
    { id: 'm1', date: '2026-02-19T22:05:00', rival: 'ONSE FC', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm2', date: '2026-02-26T20:15:00', rival: 'Nacional', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm3', date: '2026-03-05T22:05:00', rival: 'Sparta', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm4', date: '2026-03-12T21:10:00', rival: 'Hulk City', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm5', date: '2026-03-19T23:00:00', rival: 'Changos Camperos', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm6', date: '2026-03-26T21:10:00', rival: 'Paella', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm7', date: '2026-04-09T20:15:00', rival: 'MINGORRUBIO BALOMPIÉ', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm8', date: '2026-04-16T22:05:00', rival: 'SMASH BROTHERS', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm9', date: '2026-04-30T21:10:00', rival: 'ONSE FC', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm10', date: '2026-05-07T22:05:00', rival: 'Nacional', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm11', date: '2026-05-14T21:10:00', rival: 'Sparta', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm12', date: '2026-05-21T20:15:00', rival: 'Hulk City', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm13', date: '2026-05-28T23:00:00', rival: 'Changos Camperos', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm14', date: '2026-06-04T20:15:00', rival: 'Paella', home: true, venue: 'Velòdrom F7', result: '-' },
    { id: 'm15', date: '2026-06-11T20:15:00', rival: 'MINGORRUBIO BALOMPIÉ', home: false, venue: 'Velòdrom F7', result: '-' },
    { id: 'm16', date: '2026-06-18T21:10:00', rival: 'SMASH BROTHERS', home: true, venue: 'Velòdrom F7', result: '-' }
  ],
  votesByMatch: {},
  attendanceByMatch: { m1: { p3: 'confirmado', p6: 'confirmado', p7: 'pendiente', p15: 'confirmado', p2: 'pendiente' } },
  lineup: ['mordillo', 'pomares', 'cuco', 'altimira', 'dani', 'alex', 'porras']
};

const SUPABASE_URL = 'https://ogwhtfrmsyneojqtiemp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Bbt2M-26ya-1CE4DqZDgFg_wf7Gc6gq';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = {
  data: null,
  sessionUser: null,
  selectedMatchId: null,
  convocatoria: {
    matchId: null,
    attendanceByUserId: {},
    profileIdByPlayerId: {},
    lastSaveResult: '-'
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
  return {
    id: String(row.id),
    date: row.date_time || row.date,
    rival: row.rival || row.opponent || 'Rival',
    home: row.home ?? row.is_home ?? true,
    venue: row.venue || 'Velòdrom F7',
    result: row.result || '-'
  };
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeAttendanceStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'yes' || value === 'confirmado') return 'confirmado';
  if (value === 'no') return 'no';
  return 'pendiente';
}

function getConvocatoriaStatusForPlayer(playerId) {
  const userId = state.convocatoria.profileIdByPlayerId[playerId];
  if (!userId) return 'pendiente';
  return normalizeAttendanceStatus(state.convocatoria.attendanceByUserId[userId]);
}

async function loadConvocatoriaData(matchId) {
  state.convocatoria.matchId = matchId;
  state.convocatoria.attendanceByUserId = {};
  state.convocatoria.profileIdByPlayerId = {};

  if (!supabaseClient || !matchId) return;

  const players = getPlayers();
  const { data: profiles, error: profilesError } = await supabaseClient
    .from('profiles')
    .select('id, display_name, role');

  if (profilesError) {
    console.error('[attendance] profiles load error', profilesError);
    showToast('Error cargando perfiles: ' + (profilesError.message || profilesError.code), 'error');
  } else if (Array.isArray(profiles)) {
    const profileIdByName = {};
    profiles.forEach((profile) => {
      const key = normalizeName(profile.display_name);
      if (key && !profileIdByName[key]) profileIdByName[key] = profile.id;
    });

    players.forEach((player) => {
      const matchedId = profileIdByName[normalizeName(player.name)];
      if (matchedId) {
        state.convocatoria.profileIdByPlayerId[player.id] = matchedId;
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
  console.log('[attendance] saving', { matchId, userId, status });

  if (!supabaseClient) {
    const error = { message: 'Supabase no disponible', code: 'NO_CLIENT' };
    console.error('[attendance] error', error);
    state.convocatoria.lastSaveResult = JSON.stringify({ ok: false, ...error });
    showToast('Error guardando asistencia: ' + (error.message || error.code), 'error');
    return false;
  }

  const { data, error } = await supabaseClient
    .from('attendance')
    .upsert({ match_id: matchId, user_id: userId, status }, { onConflict: 'match_id,user_id' })
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
  const fallbackData = JSON.parse(JSON.stringify(FALLBACK_DATA));

  if (supabaseClient) {
    try {
      const [playersRes, matchesRes] = await Promise.all([
        supabaseClient.from('players').select('*').order('number', { ascending: true, nullsFirst: false }),
        supabaseClient.from('matches').select('*').order('date_time', { ascending: true })
      ]);

      if (!playersRes.error && !matchesRes.error && Array.isArray(playersRes.data) && Array.isArray(matchesRes.data)) {
        state.data = {
          ...fallbackData,
          players: playersRes.data.map(mapPlayerRow),
          matches: matchesRes.data.map(mapMatchRow)
        };
        return;
      }
    } catch {
      // Fallbacks handled below.
    }
  }

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('no data');
    state.data = await res.json();
    return;
  } catch {
    state.data = fallbackData;
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
  return getMatches().find((m) => new Date(m.date) > now) || getMatches()[0];
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(status) {
  return status === 'confirmado' ? '✅ Confirmado' : status === 'no' ? '❌ No disponible' : '⏳ Pendiente';
}

function parseResult(result) {
  if (!result || result === '-' || !result.includes('-')) return null;
  const [a, b] = result.split('-').map((n) => Number(n.trim()));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return [a, b];
}

function getVotesTotals() {
  const totals = {};
  const fromData = state.data.votesByMatch || {};
  Object.values(fromData).forEach((votes) => {
    Object.entries(votes).forEach(([playerId, count]) => {
      totals[playerId] = (totals[playerId] || 0) + Number(count || 0);
    });
  });
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith('mvpVote:')) return;
    const playerId = localStorage.getItem(key);
    if (playerId) totals[playerId] = (totals[playerId] || 0) + 1;
  });
  return totals;
}

function getCurrentPlayer() {
  if (!state.sessionUser) return null;
  const byProfile = getPlayers().find((p) => p.id === state.sessionUser.profileId);
  if (byProfile) return byProfile;
  const display = (state.sessionUser.displayName || '').toLowerCase();
  return getPlayers().find((p) => p.name.toLowerCase() === display) || null;
}

function route() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const isAdmin = state.sessionUser?.role === 'admin';
  const view = hash === 'admin' && !isAdmin ? 'home' : hash;

  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.bottom-nav a').forEach((el) => el.classList.toggle('active', el.dataset.tab === view));
}

function renderHome() {
  const players = getPlayers();
  if (!players.length) {
    $('myStats').innerHTML = '<p>Sin jugadores cargados todavía.</p>';
    $('topMvpList').innerHTML = '<li>Sin datos de MVP todavía.</li>';
    $('lineupList').innerHTML = '<span>Sin alineación disponible.</span>';
    $('nextMatchText').textContent = 'Sin partido próximo';
    return;
  }

  const me = getCurrentPlayer() || players[0];
  const nextMatch = getUpcomingMatch();
  const votes = getVotesTotals();
  const ranking = players
    .map((p) => ({ ...p, totalMvp: p.stats.mvps + (votes[p.id] || 0) }))
    .sort((a, b) => b.totalMvp - a.totalMvp);

  $('myStats').innerHTML = [
    ['Goles', me.stats.goles], ['Asist.', me.stats.asistencias], ['Amar.', me.stats.amarillas],
    ['Rojas', me.stats.rojas], ['MVPs', me.stats.mvps + (votes[me.id] || 0)]
  ].map(([label, value]) => `<div class="stat-item"><small>${label}</small><strong>${value}</strong></div>`).join('');

  $('nextMatchText').textContent = `${nextMatch ? `${formatDate(nextMatch.date)} vs ${nextMatch.rival}` : 'Sin partido próximo'}`;
  $('topMvpList').innerHTML = ranking.slice(0, 5).map((p) => `<li>${p.name} <span class="badge">${p.totalMvp}</span></li>`).join('') || '<li>Sin votos aún.</li>';
  $('lineupList').innerHTML = (state.data.lineup || []).map((p) => `<span>${p}</span>`).join('') || '<span>Sin alineación disponible.</span>';
}

function renderConvocatoria() {
  const matches = getMatches();
  const upcoming = getUpcomingMatch();
  if (!state.selectedMatchId) state.selectedMatchId = upcoming?.id || matches[0]?.id;

  if (!matches.length) {
    $('matchSelector').innerHTML = '';
    $('attendanceList').innerHTML = '<li>No hay partidos cargados todavía.</li>';
    $('countConfirmados').textContent = 'Confirmados: 0';
    $('countPendientes').textContent = 'Pendientes: 0';
    $('countBajas').textContent = 'Bajas: 0';
    return;
  }

  $('matchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('matchSelector').value = state.selectedMatchId;

  if (state.convocatoria.matchId !== state.selectedMatchId) {
    $('attendanceList').innerHTML = '<li>Cargando asistencia...</li>';
    loadConvocatoriaData(state.selectedMatchId).then(() => renderConvocatoria());
    return;
  }

  const players = getPlayers();
  const isAdmin = state.sessionUser.role === 'admin';
  const authUid = state.sessionUser.id;

  let confirmados = 0;
  let pendientes = 0;
  let bajas = 0;

  $('attendanceList').innerHTML = players.map((p) => {
    const userId = state.convocatoria.profileIdByPlayerId[p.id];
    const st = getConvocatoriaStatusForPlayer(p.id);

    if (st === 'confirmado') confirmados += 1;
    else if (st === 'no') bajas += 1;
    else pendientes += 1;

    const editable = Boolean(userId) && (isAdmin || userId === authUid);
    const showActions = isAdmin || userId === authUid || !userId;
    const disabledAttr = editable ? '' : 'disabled';

    return `<li>
      <strong>${p.name}</strong> <span class="badge">${statusLabel(st)}</span>
      <div class="att-actions ${showActions ? '' : 'hidden'}">
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="yes" ${disabledAttr}>✅</button>
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="pending" ${disabledAttr}>⏳</button>
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="no" ${disabledAttr}>❌</button>
      </div>
    </li>`;
  }).join('');

  $('countConfirmados').textContent = `Confirmados: ${confirmados}`;
  $('countPendientes').textContent = `Pendientes: ${pendientes}`;
  $('countBajas').textContent = `Bajas: ${bajas}`;

  const debug = $('convocatoriaDebug');
  if (debug) {
    if (isAdmin) {
      debug.classList.remove('hidden');
      debug.textContent = [
        '[debug/convocatoria]',
        `matchId: ${state.selectedMatchId || '-'}`,
        `authUid: ${authUid || '-'}`,
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

function renderMvp() {
  const matches = getMatches();
  const players = getPlayers();
  const upcoming = getUpcomingMatch();

  if (!matches.length || !players.length) {
    $('mvpMatchSelector').innerHTML = '';
    $('mvpPlayerSelector').innerHTML = '';
    $('mvpRankingList').innerHTML = '<li>Sin datos para MVP todavía.</li>';
    return;
  }

  $('mvpMatchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('mvpPlayerSelector').innerHTML = players.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  if (upcoming) $('mvpMatchSelector').value = upcoming.id;

  const votes = getVotesTotals();
  const ranking = players
    .map((p) => ({ ...p, total: p.stats.mvps + (votes[p.id] || 0) }))
    .sort((a, b) => b.total - a.total);

  $('mvpRankingList').innerHTML = ranking.map((p) => `<li>${p.name} <span class="badge">${p.total}</span></li>`).join('');
}

function renderAdmin() {
  const isAdmin = state.sessionUser.role === 'admin';
  document.querySelector('.admin-tab').classList.toggle('hidden', !isAdmin);
  document.querySelector('[data-view="admin"]').classList.toggle('hidden', !isAdmin);

  if (!isAdmin) return;

  const matches = getMatches();
  const players = getPlayers();

  $('adminMatchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('adminPlayerSelector').innerHTML = players.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
}

function renderAll() {
  $('welcomeText').textContent = `Hola, ${state.sessionUser.displayName}`;
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
  const confirmed = players.filter((p) => getConvocatoriaStatusForPlayer(p.id) === 'confirmado');

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

function openMatchModal(matchId) {
  const m = getMatches().find((x) => x.id === matchId);
  if (!m) return;
  $('modalTitle').textContent = `${m.rival} · ${formatDate(m.date)}`;
  $('modalDetail').textContent = `Localía: ${m.home ? 'Casa' : 'Fuera'} · Campo: ${m.venue || 'Velòdrom F7'} · Resultado: ${m.result} · Actualizar jueves post-partido`;

  const adminZone = $('modalAdminEdit');
  const isAdmin = state.sessionUser.role === 'admin';
  adminZone.classList.toggle('hidden', !isAdmin);
  $('modalResultInput').value = m.result;
  $('modalSaveResultBtn').onclick = () => {
    const o = readJSON('matchResultsOverride', {});
    o[m.id] = $('modalResultInput').value.trim() || '-';
    writeJSON('matchResultsOverride', o);
    renderAll();
    $('matchModal').close();
    showToast('Resultado actualizado');
  };

  $('matchModal').showModal();
}

async function ensureProfile(user) {
  if (!supabaseClient || !user) return null;

  const { data: existing, error: selectError } = await supabaseClient
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    console.warn('No se pudo leer perfil:', selectError.message);
  }

  if (existing) return existing;

  const displayName = (user.email || 'jugador').split('@')[0];
  const profilePayload = { id: user.id, display_name: displayName, role: 'player' };
  const { data: inserted, error: insertError } = await supabaseClient
    .from('profiles')
    .insert(profilePayload)
    .select('id, display_name, role')
    .single();

  if (insertError) {
    console.warn('No se pudo crear perfil:', insertError.message);
    return profilePayload;
  }

  return inserted;
}

function applyAuthUI(sessionUser) {
  state.sessionUser = sessionUser;
  const loggedIn = Boolean(sessionUser);
  $('loginScreen').classList.toggle('hidden', loggedIn);
  $('app').classList.toggle('hidden', !loggedIn);

  if (!loggedIn) {
    window.location.hash = '#home';
    return;
  }

  if (!window.location.hash) {
    window.location.hash = '#home';
  }

  renderAll();
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
    applyAuthUI(null);
    return;
  }

  const profile = await ensureProfile(user);
  await loadData();
  state.selectedMatchId = state.selectedMatchId || getUpcomingMatch()?.id || getMatches()[0]?.id;
  await loadConvocatoriaData(state.selectedMatchId);

  applyAuthUI({
    id: user.id,
    email: user.email,
    displayName: profile?.display_name || (user.email || 'jugador').split('@')[0],
    role: profile?.role || 'player',
    profileId: profile?.id || user.id
  });
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').textContent = '';

    const email = $('email').value.trim();
    const password = $('password').value.trim();

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      $('loginError').textContent = error.message || 'Credenciales incorrectas.';
      return;
    }

    await syncSession();
  });

  $('signupBtn').addEventListener('click', async () => {
    $('loginError').textContent = '';
    const email = $('email').value.trim();
    const password = $('password').value.trim();

    const { error } = await supabaseClient.auth.signUp({ email, password });
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
    await loadConvocatoriaData(state.selectedMatchId);
    renderConvocatoria();
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.action === 'att') {
      const status = btn.dataset.status;
      const matchId = $('matchSelector').value || state.selectedMatchId;
      const mappedUserId = btn.dataset.userId;
      const isAdmin = state.sessionUser.role === 'admin';
      const userId = isAdmin ? mappedUserId : state.sessionUser.id;

      if (!matchId) {
        const error = { message: 'Partido no seleccionado', code: 'NO_MATCH' };
        console.error('[attendance] error', error);
        showToast('Error guardando asistencia: ' + error.message, 'error');
        return;
      }

      if (!userId) {
        const error = { message: 'Jugador sin perfil vinculado', code: 'NO_PROFILE' };
        console.error('[attendance] error', error);
        showToast('Error guardando asistencia: ' + error.message, 'error');
        return;
      }

      const canEdit = isAdmin || state.sessionUser.id === userId;
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
  });

  $('generateImageBtn').addEventListener('click', () => generateConvImage(state.selectedMatchId));
  $('adminImageBtn').addEventListener('click', () => generateConvImage(state.selectedMatchId || getUpcomingMatch()?.id));

  $('voteBtn').addEventListener('click', () => {
    const matchId = $('mvpMatchSelector').value;
    const playerId = $('mvpPlayerSelector').value;
    const key = `mvpVote:${matchId}:${state.sessionUser.id}`;
    if (localStorage.getItem(key)) {
      $('voteMessage').textContent = 'Ya votaste este partido.';
      return;
    }
    localStorage.setItem(key, playerId);
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
    if (!session?.user) {
      applyAuthUI(null);
      return;
    }

    const profile = await ensureProfile(session.user);
    applyAuthUI({
      id: session.user.id,
      email: session.user.email,
      displayName: profile?.display_name || (session.user.email || 'jugador').split('@')[0],
      role: profile?.role || 'player',
      profileId: profile?.id || session.user.id
    });
  });

  await syncSession();
}

init();
