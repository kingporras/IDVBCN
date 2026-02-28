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

const USERS = [
  { username: 'plans', pin: '1', playerId: 'p1', role: 'player' },
  { username: 'pomares', pin: '2', playerId: 'p2', role: 'player' },
  { username: 'porras', pin: '4', playerId: 'p3', role: 'admin' },
  { username: 'cuco', pin: '5', playerId: 'p4', role: 'player' },
  { username: 'altimira', pin: '7', playerId: 'p5', role: 'player' },
  { username: 'alex', pin: '9', playerId: 'p6', role: 'player' },
  { username: 'dani', pin: '10', playerId: 'p7', role: 'player' },
  { username: 'delrio', pin: '11', playerId: 'p8', role: 'player' },
  { username: 'peke', pin: '17', playerId: 'p9', role: 'player' },
  { username: 'sergio', pin: '19', playerId: 'p10', role: 'player' },
  { username: 'rony', pin: '23', playerId: 'p11', role: 'player' },
  { username: 'malle', pin: '30', playerId: 'p12', role: 'player' },
  { username: 'edgar', pin: '44', playerId: 'p13', role: 'player' },
  { username: 'joeliko', pin: '69', playerId: 'p14', role: 'player' },
  { username: 'mordillo', pin: '99', playerId: 'p15', role: 'player' }
];

const state = { data: null, sessionUser: null, selectedMatchId: null };

const $ = (id) => document.getElementById(id);

async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('no data');
    state.data = await res.json();
  } catch {
    state.data = FALLBACK_DATA;
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

function getSessionUser() {
  return readJSON('sessionUser', null);
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

function getAttendanceMap(matchId) {
  const saved = readJSON('attendanceByMatch', {});
  const base = state.data.attendanceByMatch[matchId] || {};
  const merged = { ...base, ...(saved[matchId] || {}) };
  const all = {};
  getPlayers().forEach((p) => {
    all[p.id] = merged[p.id] || 'pendiente';
  });
  return all;
}

function setAttendance(matchId, playerId, status) {
  const all = readJSON('attendanceByMatch', {});
  all[matchId] = { ...(all[matchId] || {}), [playerId]: status };
  writeJSON('attendanceByMatch', all);
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
  return getPlayers().find((p) => p.id === state.sessionUser.playerId);
}

function route() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const isAdmin = state.sessionUser?.role === 'admin';
  const view = hash === 'admin' && !isAdmin ? 'home' : hash;

  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.bottom-nav a').forEach((el) => el.classList.toggle('active', el.dataset.tab === view));
}

function renderHome() {
  const me = getCurrentPlayer();
  const nextMatch = getUpcomingMatch();
  const votes = getVotesTotals();
  const ranking = getPlayers()
    .map((p) => ({ ...p, totalMvp: p.stats.mvps + (votes[p.id] || 0) }))
    .sort((a, b) => b.totalMvp - a.totalMvp);

  $('myStats').innerHTML = [
    ['Goles', me.stats.goles], ['Asist.', me.stats.asistencias], ['Amar.', me.stats.amarillas],
    ['Rojas', me.stats.rojas], ['MVPs', me.stats.mvps + (votes[me.id] || 0)]
  ].map(([label, value]) => `<div class="stat-item"><small>${label}</small><strong>${value}</strong></div>`).join('');

  $('nextMatchText').textContent = `${nextMatch ? `${formatDate(nextMatch.date)} vs ${nextMatch.rival}` : 'Sin partido próximo'}`;
  $('topMvpList').innerHTML = ranking.slice(0, 5).map((p) => `<li>${p.name} <span class="badge">${p.totalMvp}</span></li>`).join('');
  $('lineupList').innerHTML = state.data.lineup.map((p) => `<span>${p}</span>`).join('');
}

function renderConvocatoria() {
  const matches = getMatches();
  const upcoming = getUpcomingMatch();
  if (!state.selectedMatchId) state.selectedMatchId = upcoming?.id || matches[0]?.id;

  $('matchSelector').innerHTML = matches.map((m) => `<option value="${m.id}">${formatDate(m.date)} · ${m.rival}</option>`).join('');
  $('matchSelector').value = state.selectedMatchId;

  const attendance = getAttendanceMap(state.selectedMatchId);
  const players = getPlayers();
  const isAdmin = state.sessionUser.role === 'admin';

  let confirmados = 0;
  let pendientes = 0;
  let bajas = 0;

  $('attendanceList').innerHTML = players.map((p) => {
    const st = attendance[p.id];
    if (st === 'confirmado') confirmados += 1;
    else if (st === 'no') bajas += 1;
    else pendientes += 1;

    const editable = isAdmin || p.id === state.sessionUser.playerId;
    return `<li>
      <strong>${p.name}</strong> <span class="badge">${statusLabel(st)}</span>
      <div class="att-actions ${editable ? '' : 'hidden'}">
        <button type="button" data-action="att" data-player="${p.id}" data-status="confirmado">✅</button>
        <button type="button" data-action="att" data-player="${p.id}" data-status="pendiente">⏳</button>
        <button type="button" data-action="att" data-player="${p.id}" data-status="no">❌</button>
      </div>
    </li>`;
  }).join('');

  $('countConfirmados').textContent = `Confirmados: ${confirmados}`;
  $('countPendientes').textContent = `Pendientes: ${pendientes}`;
  $('countBajas').textContent = `Bajas: ${bajas}`;
}

function renderCalendario() {
  $('calendarList').innerHTML = getMatches().map((m) => `
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

  $('squadList').innerHTML = getPlayers()
    .map((p) => `<li><strong>#${p.dorsal} ${p.name}</strong> (${p.position}) · G:${p.stats.goles} A:${p.stats.asistencias} MVP:${p.stats.mvps}</li>`)
    .join('');
}

function renderMvp() {
  const matches = getMatches();
  const players = getPlayers();
  const upcoming = getUpcomingMatch();

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
  $('welcomeText').textContent = `Hola, ${state.sessionUser.username}`;
  renderHome();
  renderConvocatoria();
  renderCalendario();
  renderClub();
  renderMvp();
  renderAdmin();
  route();
}

function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

function generateConvImage(matchId) {
  const match = getMatches().find((m) => m.id === matchId);
  if (!match) return;
  const attendance = getAttendanceMap(matchId);
  const players = getPlayers();
  const confirmed = players.filter((p) => attendance[p.id] === 'confirmado');

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

function bindEvents() {
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = $('username').value.trim().toLowerCase();
    const pin = $('pin').value.trim();
    const found = USERS.find((u) => u.username === username && u.pin === pin);
    if (!found) {
      $('loginError').textContent = 'Credenciales incorrectas.';
      return;
    }
    writeJSON('sessionUser', found);
    state.sessionUser = found;
    $('loginScreen').classList.add('hidden');
    $('app').classList.remove('hidden');
    renderAll();
  });

  $('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('sessionUser');
    state.sessionUser = null;
    $('app').classList.add('hidden');
    $('loginScreen').classList.remove('hidden');
    window.location.hash = '#home';
  });

  $('goConfirmBtn').addEventListener('click', () => {
    state.selectedMatchId = getUpcomingMatch()?.id;
    window.location.hash = '#convocatoria';
    renderConvocatoria();
    route();
  });

  $('matchSelector').addEventListener('change', (e) => {
    state.selectedMatchId = e.target.value;
    renderConvocatoria();
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.action === 'att') {
      const playerId = btn.dataset.player;
      const status = btn.dataset.status;
      const canEdit = state.sessionUser.role === 'admin' || state.sessionUser.playerId === playerId;
      if (!canEdit) return;
      setAttendance(state.selectedMatchId, playerId, status);
      renderConvocatoria();
      renderHome();
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
    const key = `mvpVote:${matchId}:${state.sessionUser.username}`;
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

  const session = getSessionUser();
  if (!session) {
    $('loginScreen').classList.remove('hidden');
    $('app').classList.add('hidden');
    return;
  }

  state.sessionUser = session;
  $('loginScreen').classList.add('hidden');
  $('app').classList.remove('hidden');
  renderAll();
}

init();
