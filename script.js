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
  actaEditor: {
    selectedMatchId: null,
    resultHome: '',
    resultAway: '',
    goalRows: [],
    cardRows: [],
    schemaStatus: 'unknown',
    loadedMatchId: null
  },
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
    votesByMatch: {},
    globalTotals: {},
    lastVotePayload: '-'
  },
  teamStats: {
    tab: 'goals',
    attendanceStatus: 'idle',
    attendanceByPlayerId: null
  },
  homeAttendanceSummary: {
    matchId: null,
    status: 'idle',
    counts: null
  },
  clubMessageSeed: Date.now(),
  matchEventsByMatch: {},
  officialLeagueTab: 'standings',
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
const OFFICIAL_LINKS = {
  instagram: 'https://instagram.com/interdeverdunbcn',
  standings: 'https://apuntamelo.com/grupo/9/26/0/653/0/3349/0',
  calendar: 'https://apuntamelo.com/grupo/9/26/0/653/0/3349/0',
  team: 'https://apuntamelo.com/equipo/9/26/0/653/0/3349/26489/0'
};
const CLUB_MESSAGES = [
  'Juntos somos más fuertes.',
  'Presión, intensidad y cabeza.',
  'Defender juntos, atacar con calma.',
  'Cada balón dividido es nuestro.',
  'Hoy toca correr por el de al lado.',
  'Equipo corto, líneas juntas y confianza.',
  'Primero competir, luego jugar.',
  'El escudo se defiende desde el primer minuto.'
];
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
    label: '1-2-3-1',
    summary: 'Sistema equilibrado con tres medios para abrir campo y un punta de referencia.',
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
    label: '1-3-2-1',
    summary: 'Estructura sólida para salir con calma desde atrás y proteger el centro.',
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 25, y: 68 },
      D2: { x: 50, y: 64 },
      D3: { x: 75, y: 68 },
      M1: { x: 38, y: 42 },
      M2: { x: 62, y: 42 },
      F1: { x: 50, y: 18 }
    }
  },
  '1-2-2-2': {
    slots: ['GK', 'D1', 'D2', 'M1', 'M2', 'F1', 'F2'],
    label: '1-2-2-2',
    summary: 'Doble punta para presionar arriba y atacar con apoyos cercanos.',
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 34, y: 70 },
      D2: { x: 66, y: 70 },
      M1: { x: 38, y: 48 },
      M2: { x: 62, y: 48 },
      F1: { x: 38, y: 22 },
      F2: { x: 62, y: 22 }
    }
  },
  '1-3-1-2': {
    slots: ['GK', 'D1', 'D2', 'D3', 'M1', 'F1', 'F2'],
    label: '1-3-1-2',
    summary: 'Tres atrás, un medio responsable y dos puntas para alternar apoyo y ruptura.',
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 24, y: 70 },
      D2: { x: 50, y: 66 },
      D3: { x: 76, y: 70 },
      M1: { x: 50, y: 47 },
      F1: { x: 38, y: 22 },
      F2: { x: 62, y: 22 }
    }
  },
  '1-1-3-2': {
    slots: ['GK', 'D1', 'M1', 'M2', 'M3', 'F1', 'F2'],
    label: '1-1-3-2',
    summary: 'Muy ofensiva: un cierre, tres medios y dos puntas para dominar campo rival.',
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 50, y: 70 },
      M1: { x: 25, y: 48 },
      M2: { x: 50, y: 44 },
      M3: { x: 75, y: 48 },
      F1: { x: 38, y: 22 },
      F2: { x: 62, y: 22 }
    }
  },
  '1-2-1-3': {
    slots: ['GK', 'D1', 'D2', 'M1', 'F1', 'F2', 'F3'],
    label: '1-2-1-3',
    summary: 'Plan agresivo con tres arriba para remontar, apretar o castigar defensas lentas.',
    positions: {
      GK: { x: 50, y: 88 },
      D1: { x: 35, y: 70 },
      D2: { x: 65, y: 70 },
      M1: { x: 50, y: 48 },
      F1: { x: 25, y: 24 },
      F2: { x: 50, y: 18 },
      F3: { x: 75, y: 24 }
    }
  }
};

const FORMATION_TACTICS = {
  default: {
    label: 'Plan general',
    summary: 'Sin alineación publicada todavía. Mantener el equipo junto y decidir rápido con balón.',
    tips: [
      'Cerrar por dentro primero y obligar al rival a jugar por fuera.',
      'Primer pase seguro tras robo: si no hay ventaja, reiniciar.',
      'Hablar mucho en cambios de marca y coberturas.'
    ],
    strengths: ['Orden', 'Comunicación', 'Transiciones simples'],
    risks: ['Partirse en dos', 'Perder marcas en segunda jugada']
  },
  '1-2-3-1': {
    label: 'Equilibrio y amplitud',
    summary: 'Tres medios para ocupar todo el ancho y un punta fijando centrales.',
    tips: [
      'Abrir campo con los medios exteriores y buscar al punta rápido.',
      'Los dos defensas deben escalonarse para evitar contras.',
      'El medio centro debe dar siempre una línea de pase.'
    ],
    strengths: ['Amplitud', 'Pase interior', 'Llegada desde segunda línea'],
    risks: ['Espalda de los medios', 'Defensas expuestos si se pierde por dentro']
  },
  '1-3-2-1': {
    label: 'Salida limpia',
    summary: 'Tres atrás para proteger mejor y progresar con paciencia.',
    tips: [
      'Salir con calma desde tres atrás y no partir el equipo.',
      'Los dos medios deben ofrecerse entre líneas.',
      'Cuando perdamos balón, cerrar por dentro primero.'
    ],
    strengths: ['Seguridad atrás', 'Coberturas', 'Control de ritmo'],
    risks: ['Punta aislado', 'Poca amplitud si los defensas no suben']
  },
  '1-2-2-2': {
    label: 'Presión con doble punta',
    summary: 'Dos puntas para incomodar salida rival y atacar con más presencia en área.',
    tips: [
      'Dos puntas arriba para presionar salida rival.',
      'Los dos medios deben guardar equilibrio y no irse los dos a la vez.',
      'Buscar paredes rápidas por dentro.'
    ],
    strengths: ['Presión alta', 'Remate', 'Apoyos cercanos'],
    risks: ['Bandas libres', 'Medios superados si saltan a la vez']
  },
  '1-3-1-2': {
    label: 'Bloque y dos referencias',
    summary: 'Tres defensas, un medio clave y dos puntas alternando apoyo y ruptura.',
    tips: [
      'Bloque sólido atrás, un medio con mucha responsabilidad.',
      'Los puntas deben alternar apoyo y ruptura.',
      'No perder el centro: el medio debe estar siempre bien perfilado.'
    ],
    strengths: ['Centro protegido', 'Dos amenazas arriba', 'Coberturas'],
    risks: ['Medio solo', 'Ataques previsibles si no se abren apoyos']
  },
  '1-1-3-2': {
    label: 'Dominio ofensivo',
    summary: 'Mucho peso en campo rival, ideal para presionar y atacar tras robo.',
    tips: [
      'El cierre no debe dividirse: manda y temporiza.',
      'Los tres medios tienen que alternar amplitud y apoyo interior.',
      'Tras pérdida, falta táctica o repliegue inmediato.'
    ],
    strengths: ['Superioridad arriba', 'Segundas jugadas', 'Presión'],
    risks: ['Espalda del cierre', 'Contras si los medios no vuelven']
  },
  '1-2-1-3': {
    label: 'Ataque total',
    summary: 'Tres atacantes para estirar al rival; útil si toca remontar o apretar.',
    tips: [
      'El medio debe girar rápido el juego y no conducir de más.',
      'Los tres puntas deben ocupar carriles distintos.',
      'Si perdemos balón, el punta central tapa pase interior.'
    ],
    strengths: ['Amenaza constante', 'Amplitud alta', 'Mucho remate'],
    risks: ['Equipo largo', 'Defensas en igualdad si no hay presión']
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
    const [playersRes, matchesRes, lineupsRes, eventsRes] = await Promise.all([
      supabaseClient.from('players').select('*').order('number', { ascending: true, nullsFirst: false }),
      supabaseClient.from('matches').select('*').order('date_time', { ascending: true }),
      supabaseClient.from('lineups').select('match_id, player_id, position_slot'),
      supabaseClient.from('match_events').select('match_id,event_type,team,player_id,assist_player_id,own_goal,sequence')
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

    state.matchEventsByMatch = {};
    if (eventsRes?.error) {
      console.warn('[match-events] unavailable', eventsRes.error);
    } else {
      (eventsRes?.data || []).forEach((row) => {
        if (!row?.match_id) return;
        const matchId = String(row.match_id);
        if (!state.matchEventsByMatch[matchId]) state.matchEventsByMatch[matchId] = [];
        state.matchEventsByMatch[matchId].push(row);
      });
      Object.values(state.matchEventsByMatch).forEach((rows) => rows.sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)));
    }
  } catch (error) {
    console.error(error);
    state.data = emptyData;
    state.lineupsByMatch = {};
    state.matchEventsByMatch = {};
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

function getActaMatchOptions() {
  return getMatches()
    .filter((m) => isUuid(m.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getDefaultActaMatch() {
  const options = getActaMatchOptions();
  if (!options.length) return null;
  const pending = options.find((m) => isPendingMatch(m));
  if (pending) return pending;
  const latestPast = options.find((m) => new Date(m.date) < new Date());
  return latestPast || getUpcomingMatch() || options[0];
}

function getActaInterGoals(match, homeGoals, awayGoals) {
  const home = Number(homeGoals);
  const away = Number(awayGoals);
  if (!match || !Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) return 0;
  return match.home ? home : away;
}

function getActaSelectedMatch() {
  const selectedId = state.actaEditor?.selectedMatchId;
  return getMatches().find((m) => m.id === selectedId) || getDefaultActaMatch();
}

function isMissingActaSchemaError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return ['42P01', '42703', '42883', 'PGRST202', 'PGRST205'].includes(code)
    || message.includes('could not find the function')
    || message.includes('could not find the table')
    || (message.includes('schema cache') && (
      message.includes('match_events')
      || message.includes('match_reports')
      || message.includes('save_match_acta')
    ))
    || (message.includes('relation') && message.includes('does not exist'));
}

function resetActaEditorForMatch(match) {
  if (!match) return;
  const [homeGoals, awayGoals] = getMatchResultTuple(match);
  state.actaEditor.selectedMatchId = match.id;
  state.actaEditor.resultHome = homeGoals == null ? '' : String(homeGoals);
  state.actaEditor.resultAway = awayGoals == null ? '' : String(awayGoals);
  state.actaEditor.goalRows = [];
  state.actaEditor.cardRows = [];
  reconcileActaGoalRows();
}

function reconcileActaGoalRows() {
  const match = getActaSelectedMatch();
  const desired = getActaInterGoals(match, state.actaEditor.resultHome, state.actaEditor.resultAway);
  const current = Array.isArray(state.actaEditor.goalRows) ? state.actaEditor.goalRows : [];
  const next = current.slice(0, desired);
  while (next.length < desired) {
    next.push({ scorerType: 'player', scorerId: '', assistId: '' });
  }
  state.actaEditor.goalRows = next;
}

async function loadActaEventsForMatch(matchId) {
  if (!supabaseClient || !isUuid(matchId)) return [];
  const { data, error } = await supabaseClient
    .from('match_events')
    .select('id,event_type,team,player_id,assist_player_id,minute,sequence,own_goal')
    .eq('match_id', matchId)
    .order('sequence', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingActaSchemaError(error)) {
      state.actaEditor.schemaStatus = 'missing';
      return [];
    }
    console.warn('[acta] events load error', error);
    state.actaEditor.schemaStatus = 'error';
    return [];
  }

  state.actaEditor.schemaStatus = 'ready';
  return data || [];
}

async function hydrateActaEditorFromDb(matchId, options = {}) {
  const match = getMatches().find((m) => m.id === matchId) || getDefaultActaMatch();
  if (!match) return;
  const force = Boolean(options.force);
  if (!force && state.actaEditor.loadedMatchId === match.id) return;

  resetActaEditorForMatch(match);
  const events = await loadActaEventsForMatch(match.id);
  const goalRows = [];
  const cardRows = [];

  events.forEach((event) => {
    if (String(event.team || '').toLowerCase() !== 'inter') return;
    if (event.event_type === 'goal') {
      goalRows.push({
        scorerType: event.own_goal ? 'own_goal' : (event.player_id ? 'player' : 'team'),
        scorerId: event.player_id ? String(event.player_id) : '',
        assistId: event.assist_player_id ? String(event.assist_player_id) : ''
      });
    }
    if (event.event_type === 'yellow_card' || event.event_type === 'red_card') {
      cardRows.push({
        playerId: event.player_id ? String(event.player_id) : '',
        cardType: event.event_type === 'red_card' ? 'rc' : 'yc'
      });
    }
  });

  if (goalRows.length) state.actaEditor.goalRows = goalRows;
  if (cardRows.length) state.actaEditor.cardRows = cardRows;
  reconcileActaGoalRows();
  state.actaEditor.loadedMatchId = match.id;
  renderActaDynamicLists();
}

function playerSelectOptions(selectedId, placeholder = 'Selecciona jugador') {
  const players = getPlayers().filter((p) => isUuid(p.id));
  return [`<option value="">${placeholder}</option>`].concat(
    players.map((p) => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>#${p.dorsal || '-'} ${escapeHtml(p.name)}</option>`)
  ).join('');
}

function renderActaDynamicLists() {
  const match = getActaSelectedMatch();
  if (!match) return;
  reconcileActaGoalRows();

  const goalsList = $('actaGoalsList');
  const cardsList = $('actaCardsList');
  const goalsCount = $('actaGoalsCount');
  const schemaHint = $('actaSchemaHint');
  const interGoals = getActaInterGoals(match, state.actaEditor.resultHome, state.actaEditor.resultAway);

  if (goalsCount) goalsCount.textContent = `${state.actaEditor.goalRows.length}/${interGoals}`;
  if (schemaHint) {
    schemaHint.textContent = state.actaEditor.schemaStatus === 'missing'
      ? 'Falta ejecutar el SQL de Acta en Supabase antes de guardar.'
      : 'El Acta actualiza calendario, club y stats. El MVP sigue separado.';
  }

  if (goalsList) {
    goalsList.innerHTML = state.actaEditor.goalRows.length
      ? state.actaEditor.goalRows.map((row, index) => {
        const scorerType = row.scorerType || 'player';
        const disabled = scorerType === 'player' ? '' : 'disabled';
        return `<article class="acta-row" data-goal-index="${index}">
          <strong>Gol ${index + 1}</strong>
          <label>Tipo</label>
          <select class="input" data-acta-field="scorerType">
            <option value="player" ${scorerType === 'player' ? 'selected' : ''}>Jugador</option>
            <option value="team" ${scorerType === 'team' ? 'selected' : ''}>Gol de equipo</option>
            <option value="own_goal" ${scorerType === 'own_goal' ? 'selected' : ''}>Propia puerta</option>
          </select>
          <label>Goleador</label>
          <select class="input" data-acta-field="scorerId" ${disabled}>${playerSelectOptions(row.scorerId)}</select>
          <label>Asistencia</label>
          <select class="input" data-acta-field="assistId">${playerSelectOptions(row.assistId, 'Sin asistencia')}</select>
        </article>`;
      }).join('')
      : '<p class="acta-empty">Pon el resultado para abrir los goles del Inter.</p>';
  }

  if (cardsList) {
    const rows = Array.isArray(state.actaEditor.cardRows) ? state.actaEditor.cardRows : [];
    cardsList.innerHTML = rows.length
      ? rows.map((row, index) => `<article class="acta-row acta-row--card" data-card-index="${index}">
          <strong>Tarjeta ${index + 1}</strong>
          <label>Jugador</label>
          <select class="input" data-acta-field="cardPlayerId">${playerSelectOptions(row.playerId)}</select>
          <label>Tipo</label>
          <select class="input" data-acta-field="cardType">
            <option value="yc" ${row.cardType !== 'rc' ? 'selected' : ''}>Amarilla</option>
            <option value="rc" ${row.cardType === 'rc' ? 'selected' : ''}>Roja</option>
          </select>
          <button type="button" class="btn btn-secondary" data-action="acta-remove-card" data-index="${index}">Quitar</button>
        </article>`).join('')
      : '<p class="acta-empty">Sin tarjetas registradas.</p>';
  }
}

function readActaResultFromInputs() {
  state.actaEditor.resultHome = $('actaResultHome')?.value ?? state.actaEditor.resultHome;
  state.actaEditor.resultAway = $('actaResultAway')?.value ?? state.actaEditor.resultAway;
  reconcileActaGoalRows();
}

function buildActaEventsPayload() {
  const match = getActaSelectedMatch();
  if (String(state.actaEditor.resultHome ?? '').trim() === '' || String(state.actaEditor.resultAway ?? '').trim() === '') {
    throw new Error('Falta el resultado del partido');
  }
  const homeGoals = Number(state.actaEditor.resultHome);
  const awayGoals = Number(state.actaEditor.resultAway);
  if (!match || !Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    throw new Error('Resultado invalido');
  }

  const expectedGoals = getActaInterGoals(match, homeGoals, awayGoals);
  if (state.actaEditor.goalRows.length !== expectedGoals) {
    throw new Error('Los goles del Acta no cuadran con el resultado del Inter');
  }

  const events = [];
  state.actaEditor.goalRows.forEach((row, index) => {
    const scorerType = row.scorerType || 'player';
    const playerId = scorerType === 'player' ? row.scorerId : null;
    if (scorerType === 'player' && !isUuid(playerId)) {
      throw new Error(`Falta goleador en el Gol ${index + 1}`);
    }
    if (isUuid(playerId) && isUuid(row.assistId) && playerId === row.assistId) {
      throw new Error(`El Gol ${index + 1} no puede tener el mismo jugador como goleador y asistente`);
    }
    events.push({
      event_type: 'goal',
      team: 'inter',
      player_id: playerId || null,
      assist_player_id: isUuid(row.assistId) ? row.assistId : null,
      minute: null,
      sequence: index + 1,
      own_goal: scorerType === 'own_goal'
    });
  });

  (state.actaEditor.cardRows || []).forEach((row, index) => {
    if (!isUuid(row.playerId)) throw new Error(`Falta jugador en la Tarjeta ${index + 1}`);
    events.push({
      event_type: row.cardType === 'rc' ? 'red_card' : 'yellow_card',
      team: 'inter',
      player_id: row.playerId,
      assist_player_id: null,
      minute: null,
      sequence: 100 + index,
      own_goal: false
    });
  });

  return { match, homeGoals, awayGoals, events };
}

async function saveActa() {
  if (!isAdmin()) return showToast('Solo admin', 'error');
  if (!supabaseClient) return showToast('Supabase no disponible', 'error');
  readActaResultFromInputs();

  let payload;
  try {
    payload = buildActaEventsPayload();
  } catch (error) {
    showToast(error.message || 'Acta invalida', 'error');
    return;
  }

  const { match, homeGoals, awayGoals, events } = payload;
  const confirmMessage = [
    `Publicar acta de ${formatMatchShort(match)} con resultado ${homeGoals}-${awayGoals}?`,
    'Esto actualizará calendario, club y estadísticas de jugadores.'
  ].join('\n');
  if (!window.confirm(confirmMessage)) return;

  const button = $('saveActaBtn');
  const previousLabel = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Guardando...';
  }

  const { error } = await supabaseClient.rpc('save_match_acta', {
    p_match_id: match.id,
    p_result_home: homeGoals,
    p_result_away: awayGoals,
    p_events: events,
    p_notes: null
  });

  if (button) {
    button.disabled = false;
    button.textContent = previousLabel || 'Publicar acta';
  }

  if (error) {
    console.error('[acta] save error', error);
    if (isMissingActaSchemaError(error)) {
      state.actaEditor.schemaStatus = 'missing';
      renderActaDynamicLists();
      showToast('Falta ejecutar el SQL de Acta en Supabase', 'error');
      return;
    }
    showToast(error.message || 'Error guardando Acta', 'error');
    return;
  }

  clearMatchResultOverride(match.id);
  state.actaEditor.schemaStatus = 'ready';
  state.actaEditor.loadedMatchId = null;
  await hydrateSessionData();
  renderAll();
  showToast('Acta publicada', 'success');
}

async function openAdminActaForMatch(matchId) {
  if (!isAdmin()) return showToast('Solo admin', 'error');
  if (!isUuid(matchId)) return showToast('Este partido no es UUID', 'error');
  state.actaEditor.selectedMatchId = matchId;
  await hydrateActaEditorFromDb(matchId, { force: true });
  window.location.hash = '#admin';
  renderAdmin();
  route();
  requestAnimationFrame(() => document.getElementById('adminActaBlock')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
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

function getSlotRole(slot) {
  const value = String(slot || '').charAt(0).toUpperCase();
  if (value === 'G') return 'GK';
  if (value === 'D') return 'D';
  if (value === 'M') return 'M';
  if (value === 'F') return 'F';
  return 'M';
}

function detectFormation(assignments = {}) {
  const assignedSlots = Object.keys(assignments || {}).filter((slot) => assignments[slot]);
  if (!assignedSlots.length) return '1-2-3-1';

  const assignedSet = new Set(assignedSlots);
  const candidates = Object.entries(FORMATIONS)
    .map(([formation, config]) => {
      const formationSet = new Set(config.slots);
      const included = assignedSlots.filter((slot) => formationSet.has(slot)).length;
      const extras = assignedSlots.filter((slot) => !formationSet.has(slot)).length;
      const missing = config.slots.filter((slot) => !assignedSet.has(slot)).length;
      const roleFit = assignedSlots.filter((slot) => {
        const role = getSlotRole(slot);
        return config.slots.some((candidate) => getSlotRole(candidate) === role);
      }).length;
      return { formation, score: included * 6 + roleFit * 2 - extras * 8 - missing };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.formation || '1-2-3-1';
}

function getLineupAssignments(matchId) {
  return state.lineupsByMatch[matchId] || {};
}

function playerNameById(playerId) {
  return getPlayers().find((p) => p.id === playerId)?.name || 'Jugador';
}

function getFormationTactic(formation) {
  return FORMATION_TACTICS[formation] || FORMATION_TACTICS.default;
}

function getFormationForMatch(matchId) {
  const assignments = getLineupAssignments(matchId);
  return Object.keys(assignments || {}).length ? detectFormation(assignments) : null;
}

function renderTacticalInsight(formation, options = {}) {
  const config = formation ? FORMATIONS[formation] : null;
  const tactic = getFormationTactic(formation);
  const compact = Boolean(options.compact);
  const title = options.title || 'Consejo táctico';
  const formationLabel = config?.label || 'Sin formación';
  const tips = tactic.tips.slice(0, compact ? 1 : 3);
  return `
    <div class="tactical-card ${compact ? 'tactical-card--compact' : ''}">
      <div class="tactical-card__head">
        <span class="tactical-card__eyebrow">${escapeHtml(title)}</span>
        <strong>${escapeHtml(formationLabel)}</strong>
      </div>
      <p>${escapeHtml(tactic.summary)}</p>
      <ul>
        ${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}
      </ul>
      ${compact ? '' : `
        <div class="tactical-card__grid">
          <section>
            <span>Fortalezas</span>
            <p>${tactic.strengths.map(escapeHtml).join(' · ')}</p>
          </section>
          <section>
            <span>Riesgos</span>
            <p>${tactic.risks.map(escapeHtml).join(' · ')}</p>
          </section>
        </div>
      `}
    </div>
  `;
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
  message.textContent = `Formación ${FORMATIONS[formation]?.label || formation}`;
  container.classList.remove('hidden');
  renderLineupField(container, assignments, formation);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractInterScorers(match) {
  const candidates = [
    match?.inter_scorers,
    match?.interScorers,
    match?.scorers,
    match?.goals,
    match?.goleadores
  ];
  const source = candidates.find((item) => item != null && item !== '');
  if (!source) return [];
  if (Array.isArray(source)) return source.map((item) => String(item).trim()).filter(Boolean);
  return String(source)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getClubMessage(seed = Date.now()) {
  const index = Math.abs(hashString(String(seed))) % CLUB_MESSAGES.length;
  return CLUB_MESSAGES[index] || CLUB_MESSAGES[0];
}

function getLastFinishedMatch() {
  return getMatches()
    .filter((match) => {
      const [homeGoals, awayGoals] = getMatchResultTuple(match);
      return homeGoals != null && awayGoals != null;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}

function getMatchEvents(matchId) {
  return state.matchEventsByMatch?.[String(matchId || '')] || [];
}

function getMatchEventSummary(match) {
  const events = getMatchEvents(match?.id);
  const goals = [];
  const assists = [];
  const cards = [];

  events.forEach((event) => {
    const type = String(event.event_type || '').toLowerCase();
    if (type === 'goal' && String(event.team || '').toLowerCase() === 'inter') {
      const scorer = event.own_goal
        ? 'Propia puerta'
        : (event.player_id ? playerNameById(event.player_id) : 'Gol de equipo');
      const assist = event.assist_player_id ? playerNameById(event.assist_player_id) : '';
      goals.push(assist ? `${scorer} · asist. ${assist}` : scorer);
      if (assist) assists.push(assist);
    }
    if ((type === 'yellow_card' || type === 'red_card') && String(event.team || '').toLowerCase() === 'inter') {
      const cardPlayer = event.player_id ? playerNameById(event.player_id) : 'Inter';
      cards.push(`${type === 'red_card' ? 'Roja' : 'Amarilla'} · ${cardPlayer}`);
    }
  });

  const fallbackGoals = !goals.length ? extractInterScorers(match) : goals;
  return {
    goals: fallbackGoals,
    assists: [...new Set(assists)],
    cards,
    hasEvents: events.length > 0
  };
}

function getMatchMvpLeaders(matchId) {
  const votesByPlayer = state.mvp.votesByMatch?.[String(matchId || '')] || {};
  const entries = Object.entries(votesByPlayer)
    .map(([playerId, total]) => ({ playerId, total: Number(total || 0), name: playerNameById(playerId) }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  if (!entries.length) return [];
  const top = entries[0].total;
  return entries.filter((entry) => entry.total === top);
}

function getRecentInterForm(limit = 5) {
  return getMatches()
    .filter((match) => {
      const [homeGoals, awayGoals] = getMatchResultTuple(match);
      return homeGoals != null && awayGoals != null;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
    .map((match) => {
      const [homeGoals, awayGoals] = getMatchResultTuple(match);
      const interGoals = match.home ? homeGoals : awayGoals;
      const rivalGoals = match.home ? awayGoals : homeGoals;
      return interGoals > rivalGoals ? 'G' : (interGoals === rivalGoals ? 'E' : 'P');
    });
}

function getAttendanceCountsForNextMatch() {
  const counts = state.homeAttendanceSummary?.counts;
  if (!counts) return null;
  return counts;
}

function renderHomeClubPulse(nextMatch) {
  const container = $('homeClubPulse');
  if (!container) return;
  const seed = `${state.clubMessageSeed}:${nextMatch?.id || 'general'}`;
  container.innerHTML = `
    <div class="club-pulse">
      <img src="escudo.png" alt="Escudo del Inter de Verdun" />
      <div>
        <span>Mensaje del club</span>
        <strong>${escapeHtml(getClubMessage(seed))}</strong>
      </div>
    </div>
  `;
}

function renderHomeAttendanceSummary(nextMatch) {
  const container = $('homeAttendanceSummary');
  if (!container) return;
  if (!nextMatch || !isUuid(nextMatch.id)) {
    container.innerHTML = '<span class="muted">Convocatoria pendiente de partido oficial.</span>';
    return;
  }
  const counts = getAttendanceCountsForNextMatch();
  if (state.homeAttendanceSummary.status === 'error') {
    container.innerHTML = '<span class="muted">Resumen de convocatoria no disponible.</span>';
    return;
  }
  if (!counts || state.homeAttendanceSummary.matchId !== nextMatch.id) {
    container.innerHTML = '<span class="muted">Convocatoria cargando...</span>';
    return;
  }
  container.innerHTML = `
    <span>${counts.yes} confirmados</span>
    <span>${counts.maybe} dudas</span>
    <span>${counts.pending} pendientes</span>
  `;
}

async function maybeLoadHomeAttendanceSummary(matchId) {
  if (!supabaseClient || !isUuid(matchId)) return;
  if (state.homeAttendanceSummary.matchId === matchId && state.homeAttendanceSummary.status !== 'idle') return;

  state.homeAttendanceSummary = { matchId, status: 'loading', counts: null };
  try {
    const { data, error } = await supabaseClient
      .from('attendance')
      .select('status')
      .eq('match_id', matchId);
    if (error) throw error;
    const totalPlayers = getPlayers().length;
    const counts = { yes: 0, maybe: 0, no: 0, pending: 0 };
    (data || []).forEach((row) => {
      const status = normalizeAttendanceStatus(row?.status);
      if (status === 'yes') counts.yes += 1;
      else if (status === 'maybe') counts.maybe += 1;
      else if (status === 'no') counts.no += 1;
    });
    counts.pending = Math.max(0, totalPlayers - counts.yes - counts.maybe - counts.no);
    state.homeAttendanceSummary = { matchId, status: 'ready', counts };
  } catch (error) {
    console.warn('[home-attendance] unavailable', error);
    state.homeAttendanceSummary = { matchId, status: 'error', counts: null };
  }
  renderHomeAttendanceSummary(getMatches().find((match) => match.id === matchId));
}

function renderHomeLastMatch() {
  const container = $('homeLastMatch');
  if (!container) return;
  const match = getLastFinishedMatch();
  if (!match) {
    container.innerHTML = '<p class="empty-state">Aún no hay último partido con resultado.</p>';
    return;
  }
  const display = getMatchDisplay(match);
  const summary = getMatchEventSummary(match);
  const mvp = getMatchMvpLeaders(match.id);
  container.innerHTML = `
    <article class="last-match-card">
      ${renderMatchdayCard(match, { compact: false })}
      <div class="last-match-card__details">
        <span>${escapeHtml(formatDate(match.date))}</span>
        <span>${escapeHtml(match.venue || 'Velòdrom F7')}</span>
      </div>
      <div class="last-match-card__chips">
        <span>Resultado ${escapeHtml(display.score)}</span>
        ${summary.goals.length ? `<span>${summary.goals.length} goles Inter</span>` : ''}
        ${mvp.length ? `<span>MVP ${escapeHtml(mvp.map((item) => item.name).join(', '))}</span>` : ''}
      </div>
      ${summary.goals.length ? `<ul class="last-match-card__events">${summary.goals.slice(0, 4).map((goal) => `<li>${escapeHtml(goal)}</li>`).join('')}</ul>` : ''}
      <button type="button" class="btn btn-secondary" data-action="open-match" data-id="${match.id}">Abrir detalle</button>
    </article>
  `;
}

function getTeamInitials(teamName) {
  const normalized = String(teamName || 'Rival').trim();
  const words = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'RV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function hashString(value) {
  return String(value || '').split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
}

function getTeamLogo(teamName) {
  const normalized = String(teamName || 'Rival').trim();
  const lower = normalized.toLowerCase();
  const isInter = lower.includes('inter') || lower === 'inter de verdun';
  if (isInter) return 'escudo.png';
  const initials = getTeamInitials(normalized);
  const palettes = [
    ['#163f65', '#4da3ff'],
    ['#0f4c5c', '#5ed3b5'],
    ['#4c3f91', '#9b8cff'],
    ['#5a3d12', '#d4af37'],
    ['#7a2443', '#ff7aaa'],
    ['#204b2d', '#6ed08d']
  ];
  const palette = palettes[Math.abs(hashString(normalized)) % palettes.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#g)"/>
      <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6"/>
      <text x="80" y="94" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="#fff">${initials}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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

function getMatchDisplay(match) {
  const [homeGoals, awayGoals] = getMatchResultTuple(match);
  const hasResult = homeGoals != null && awayGoals != null;
  const isFuture = match ? new Date(match.date) >= new Date() : false;
  const localTeam = match?.home ? 'Inter' : (match?.rival || 'Rival');
  const awayTeam = match?.home ? (match?.rival || 'Rival') : 'Inter';
  return {
    localTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    hasResult,
    status: hasResult ? 'Finalizado' : (isFuture ? 'Próximo' : 'Sin acta'),
    score: hasResult ? `${homeGoals}-${awayGoals}` : 'vs'
  };
}

function renderTeamIdentity(teamName, extraClass = '') {
  return `
    <div class="team-identity ${extraClass}">
      <img src="${getTeamLogo(teamName)}" alt="Escudo ${escapeHtml(teamName)}" />
      <strong>${escapeHtml(teamName)}</strong>
    </div>
  `;
}

function renderMatchdayCard(match, options = {}) {
  if (!match) {
    return `
      <div class="matchday-card matchday-card--empty">
        <p class="muted">Cuando haya fecha confirmada la verás aquí.</p>
      </div>
    `;
  }
  const display = getMatchDisplay(match);
  const compact = Boolean(options.compact);
  return `
    <div class="matchday-card ${compact ? 'matchday-card--compact' : ''}">
      <div class="matchday-card__top">
        <span>${escapeHtml(display.status)}</span>
        <small>${escapeHtml(match.home ? 'Casa' : 'Fuera')}</small>
      </div>
      <div class="matchday-card__teams">
        ${renderTeamIdentity(display.localTeam, 'is-local')}
        <strong class="matchday-card__score">${escapeHtml(display.score)}</strong>
        ${renderTeamIdentity(display.awayTeam, 'is-away')}
      </div>
      <div class="matchday-card__meta">
        <span>${escapeHtml(formatDate(match.date))}</span>
        <span>${escapeHtml(match.venue || 'Velòdrom F7')}</span>
      </div>
    </div>
  `;
}

function statusLabel(status) {
  if (status === 'yes') return '✅ Confirmado';
  if (status === 'no') return '❌ Baja';
  if (status === 'maybe') return '⏳ Dudoso';
  return '⏳ Pendiente';
}

function statusClass(status) {
  if (status === 'yes') return 'is-confirmed';
  if (status === 'no') return 'is-out';
  if (status === 'maybe') return 'is-maybe';
  return 'is-pending';
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
    { id: 'goals', label: '⚽ Goles' },
    { id: 'assists', label: '🎯 Asist' },
    { id: 'attendance', label: '👥 Convocatorias' },
    { id: 'mvp', label: '⭐ MVP' }
  ];
  const ranking = model.rankings[activeTab] || [];
  const maxValue = Math.max(1, ...ranking.map((item) => Number(item.value) || 0));
  const allMatches = getMatches();
  const finishedMatches = allMatches.filter((match) => {
    const [homeGoals, awayGoals] = getMatchResultTuple(match);
    return homeGoals != null && awayGoals != null;
  });
  const teamSummary = finishedMatches.reduce((acc, match) => {
    const [homeGoals, awayGoals] = getMatchResultTuple(match);
    const interGoals = match.home ? homeGoals : awayGoals;
    const rivalGoals = match.home ? awayGoals : homeGoals;
    return {
      played: acc.played + 1,
      won: acc.won + (interGoals > rivalGoals ? 1 : 0),
      lost: acc.lost + (interGoals < rivalGoals ? 1 : 0),
      gf: acc.gf + Number(interGoals || 0),
      gc: acc.gc + Number(rivalGoals || 0)
    };
  }, { played: 0, won: 0, lost: 0, gf: 0, gc: 0 });

  const rankItems = ranking.length
    ? ranking.map((item, index) => `
      <li class="team-stats__rank-row">
        <span class="team-stats__rank-pos">${index + 1}</span>
        <span class="team-stats__rank-avatar">${escapeHtml(String(item.name || 'J').trim().charAt(0).toUpperCase() || 'J')}</span>
        <div class="team-stats__rank-main">
          <span class="team-stats__rank-name">${escapeHtml(item.name)}</span>
          <span class="team-stats__rank-bar"><span style="width:${Math.max(8, Math.round(((Number(item.value) || 0) / maxValue) * 100))}%"></span></span>
        </div>
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
        <article class="team-stats__kpi"><small>⚽ Máximo goleador</small><strong>${model.kpis.topScorer.value}</strong><span>${model.kpis.topScorer.name}</span></article>
        <article class="team-stats__kpi"><small>👥 Más convocado</small><strong>${model.kpis.topAttendance.value}</strong><span>${model.kpis.topAttendance.name}</span></article>
        <article class="team-stats__kpi"><small>📅 Partidos jugados</small><strong>${teamSummary.played}</strong><span>Inter de Verdun</span></article>
      </div>
      <div class="team-stats__tabs" role="tablist" aria-label="Ranking por categoría">
        ${tabs.map((tab) => `<button type="button" class="team-stats__tab ${activeTab === tab.id ? 'is-active' : ''}" role="tab" aria-selected="${String(activeTab === tab.id)}" data-action="team-stats-tab" data-tab="${tab.id}">${tab.label}</button>`).join('')}
      </div>
      <ol class="team-stats__rank">${rankItems}</ol>
      <section class="team-stats__summary" aria-label="Resumen del equipo">
        <h4 class="team-stats__summary-title">Resumen del equipo</h4>
        <div class="team-stats__summary-grid">
          <article><small>PJ</small><strong>${teamSummary.played}</strong></article>
          <article><small>G</small><strong>${teamSummary.won}</strong></article>
          <article><small>P</small><strong>${teamSummary.lost}</strong></article>
          <article><small>GF</small><strong>${teamSummary.gf}</strong></article>
          <article><small>GC</small><strong>${teamSummary.gc}</strong></article>
        </div>
      </section>
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
  renderClub();
}

function getPlayerScoreRows(players = getPlayers()) {
  const attendance = state.teamStats?.attendanceByPlayerId || {};
  const votes = getVotesTotals();
  return players.map((player) => {
    const goals = Number(player?.stats?.goles || 0);
    const assists = Number(player?.stats?.asistencias || 0);
    const mvp = Number(votes[player.id] ?? player?.stats?.mvps ?? 0);
    const confirmed = Number(attendance[player.id] || 0);
    const points = goals * 3 + assists * 2 + mvp * 5 + confirmed;
    return { ...player, goals, assists, mvp, confirmed, points };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

function getPlayerAchievements(player, rows = getPlayerScoreRows()) {
  if (!player) return [];
  const row = rows.find((item) => item.id === player.id) || { ...player, goals: 0, assists: 0, mvp: 0, confirmed: 0, points: 0 };
  const maxGoals = Math.max(0, ...rows.map((item) => item.goals));
  const maxAssists = Math.max(0, ...rows.map((item) => item.assists));
  const maxMvp = Math.max(0, ...rows.map((item) => item.mvp));
  const maxConfirmed = Math.max(0, ...rows.map((item) => item.confirmed));
  const maxPoints = Math.max(0, ...rows.map((item) => item.points));
  const achievements = [];

  if (row.goals > 0 && row.goals === maxGoals) achievements.push('Máximo goleador');
  if (row.assists > 0 && row.assists === maxAssists) achievements.push('Mejor asistente');
  if (row.mvp > 0 && row.mvp === maxMvp) achievements.push('Rey MVP');
  if (row.confirmed > 0 && row.confirmed === maxConfirmed) achievements.push('Siempre disponible');
  if (row.points > 0 && row.points === maxPoints) achievements.push('Pulmón del equipo');
  if (row.goals >= 5) achievements.push('Killer');
  if (/def|cierre|d\b/i.test(String(player.position || '')) && row.confirmed > 0) achievements.push('Muro defensivo');

  return [...new Set(achievements)].slice(0, 4);
}

function renderClubPointsRanking(rows = getPlayerScoreRows()) {
  const container = $('clubPointsRanking');
  if (!container) return;
  const withPoints = rows.filter((row) => row.points > 0);
  if (!withPoints.length) {
    container.innerHTML = '<p class="empty-state">Aún no hay datos suficientes para el ranking global.</p>';
    return;
  }
  const leader = Math.max(1, withPoints[0].points);
  container.innerHTML = `
    <div class="points-ranking">
      ${withPoints.slice(0, 8).map((row, index) => `
        <article class="points-row">
          <span class="points-row__pos">${index + 1}</span>
          <div>
            <strong>${escapeHtml(row.name)}</strong>
            <small>${row.goals}G · ${row.assists}A · ${row.mvp}MVP · ${row.confirmed}Conv</small>
            <span class="points-row__bar"><span style="width:${Math.max(8, Math.round((row.points / leader) * 100))}%"></span></span>
          </div>
          <em>${row.points}</em>
        </article>
      `).join('')}
    </div>
  `;
}

function computeRivalSummaries() {
  const map = new Map();
  getMatches().forEach((match) => {
    const rival = match.rival || 'Rival';
    if (!map.has(rival)) {
      map.set(rival, { name: rival, played: 0, upcoming: 0, won: 0, drawn: 0, lost: 0, gf: 0, gc: 0 });
    }
    const item = map.get(rival);
    const [homeGoals, awayGoals] = getMatchResultTuple(match);
    if (homeGoals == null || awayGoals == null) {
      if (new Date(match.date) >= new Date()) item.upcoming += 1;
      return;
    }
    const interGoals = match.home ? homeGoals : awayGoals;
    const rivalGoals = match.home ? awayGoals : homeGoals;
    item.played += 1;
    item.gf += interGoals;
    item.gc += rivalGoals;
    if (interGoals > rivalGoals) item.won += 1;
    else if (interGoals === rivalGoals) item.drawn += 1;
    else item.lost += 1;
  });
  return [...map.values()].sort((a, b) => (b.played + b.upcoming) - (a.played + a.upcoming) || a.name.localeCompare(b.name));
}

function renderRivalsBlock() {
  const container = $('clubRivals');
  if (!container) return;
  const rivals = computeRivalSummaries();
  if (!rivals.length) {
    container.innerHTML = '<p class="empty-state">Aún no hay rivales en el calendario.</p>';
    return;
  }
  container.innerHTML = `
    <div class="rival-grid">
      ${rivals.map((rival) => `
        <article class="rival-card">
          <img src="${getTeamLogo(rival.name)}" alt="Avatar ${escapeHtml(rival.name)}" />
          <div>
            <strong>${escapeHtml(rival.name)}</strong>
            <small>${rival.played} jugados · ${rival.upcoming} próximos</small>
            <span>${rival.won}-${rival.drawn}-${rival.lost} · GF ${rival.gf} / GC ${rival.gc}</span>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderOfficialLeaguePanel() {
  const container = $('officialLeaguePanel');
  if (!container) return;
  const tabs = [
    { id: 'standings', label: 'Clasificación', url: OFFICIAL_LINKS.standings },
    { id: 'calendar', label: 'Calendario', url: OFFICIAL_LINKS.calendar },
    { id: 'team', label: 'Equipo', url: OFFICIAL_LINKS.team }
  ];
  const active = tabs.find((tab) => tab.id === state.officialLeagueTab) || tabs[0];
  container.innerHTML = `
    <div class="official-tabs">
      ${tabs.map((tab) => `<button type="button" class="${tab.id === active.id ? 'is-active' : ''}" data-action="official-tab" data-tab="${tab.id}">${tab.label}</button>`).join('')}
    </div>
    <div class="official-frame-wrap">
      <iframe title="${escapeHtml(active.label)} oficial Apúntamelo" src="${escapeHtml(active.url)}" loading="lazy"></iframe>
    </div>
    <div class="official-fallback">
      <p>Si la web oficial no se muestra dentro de la app, ábrela fuera.</p>
      <button type="button" class="btn btn-gold" data-action="open-official" data-url="${escapeHtml(active.url)}">Abrir ${escapeHtml(active.label.toLowerCase())} oficial</button>
      <button type="button" class="btn btn-secondary" data-action="open-official" data-url="${escapeHtml(OFFICIAL_LINKS.instagram)}">Instagram</button>
    </div>
  `;
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
    $('topMvpList').innerHTML = '<li class="empty-state">Sin datos de MVP todavía.</li>';
    $('lineupHomeMessage').textContent = 'Alineación aún no publicada';
    if ($('lineupHomeSubmessage')) $('lineupHomeSubmessage').textContent = 'Se mostrará aquí cuando el cuerpo técnico la publique.';
    $('lineupFieldHome').classList.add('hidden');
    $('lineupFieldHome').innerHTML = '';
    $('nextMatchText').textContent = 'Sin partido próximo';
    if ($('nextMatchMeta')) $('nextMatchMeta').textContent = 'Cuando haya fecha confirmada la verás aquí.';
    if ($('homeMatchCard')) $('homeMatchCard').innerHTML = renderMatchdayCard(null);
    if ($('homeTacticalPlan')) $('homeTacticalPlan').innerHTML = renderTacticalInsight(null, { compact: true, title: 'Plan de partido' });
    renderHomeClubPulse(null);
    renderHomeAttendanceSummary(null);
    renderHomeLastMatch();
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
  renderHomeClubPulse(nextMatch);
  renderHomeAttendanceSummary(nextMatch);
  if (nextMatch?.id) maybeLoadHomeAttendanceSummary(nextMatch.id);
  renderHomeLastMatch();

  if ($('homeMatchCard')) $('homeMatchCard').innerHTML = renderMatchdayCard(nextMatch);
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

  if ($('homePendingHint')) $('homePendingHint').textContent = '';
  $('topMvpList').innerHTML = ranking.slice(0, 5).map((p, index) => `
    <li class="home-mvp-row">
      <span>${index + 1}</span>
      <strong>${escapeHtml(p.name)}</strong>
      <em>${p.totalMvp}</em>
    </li>
  `).join('') || '<li class="empty-state">Sin votos aún.</li>';
  if ($('lineupHomeSubmessage')) $('lineupHomeSubmessage').textContent = nextMatch ? 'Solo lectura · publicación del cuerpo técnico.' : '';
  renderLineupForMatch('lineupFieldHome', 'lineupHomeMessage', nextMatch?.id || null, { emptyMessage: 'Alineación aún no publicada' });
  if ($('homeTacticalPlan')) {
    $('homeTacticalPlan').innerHTML = renderTacticalInsight(getFormationForMatch(nextMatch?.id), { compact: true, title: 'Plan de partido' });
  }
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
  let duda = 0;
  let bajas = 0;

  $('attendanceList').innerHTML = players.map((p) => {
    const userId = state.convocatoria.profileIdByPlayerId[p.id];
    const st = getConvocatoriaStatusForPlayer(p.id);

    if (st === 'yes') confirmados += 1;
    else if (st === 'no') bajas += 1;
    else if (st === 'maybe') duda += 1;
    else pendientes += 1;

    const isOwnPlayer = p.id === sessionUser?.playerId;
    const editable = adminMode ? Boolean(userId) : (isOwnPlayer && userId === authUid);
    const showActions = adminMode || isOwnPlayer;
    const disabledAttr = editable ? '' : 'disabled';

    const accountHint = !userId && adminMode ? '<small>sin cuenta</small>' : '';

    return `<li class="attendance-row ${statusClass(st)} ${isOwnPlayer ? 'is-me' : ''}">
      <div class="attendance-row__main">
        <span class="attendance-row__avatar">${escapeHtml(String(p.name || 'J').charAt(0).toUpperCase() || 'J')}</span>
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <small>${isOwnPlayer ? 'Tu estado' : `#${p.dorsal || '-'} · ${escapeHtml(p.position || 'N/D')}`}</small>
        </div>
        <span class="badge attendance-status ${statusClass(st)}">${statusLabel(st)}</span>
      </div>
      ${accountHint}
      <div class="att-actions ${showActions ? '' : 'hidden'}">
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="yes" ${disabledAttr}>Confirmar</button>
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="maybe" ${disabledAttr}>Duda</button>
        <button type="button" data-action="att" data-player-id="${p.id}" data-user-id="${userId || ''}" data-status="no" ${disabledAttr}>Baja</button>
      </div>
    </li>`;
  }).join('');

  $('countConfirmados').textContent = `Confirmados: ${confirmados}`;
  $('countPendientes').textContent = `Duda: ${duda} · Pend: ${pendientes}`;
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

  $('calendarList').innerHTML = matches.map((m) => {
    const display = getMatchDisplay(m);
    return `
      <li class="calendar-match ${display.hasResult ? 'is-final' : 'is-open'}">
        <button type="button" class="calendar-match__button" data-action="open-match" data-id="${m.id}">
          ${renderMatchdayCard(m, { compact: true })}
        </button>
      </li>
    `;
  }).join('');
}

function renderClub() {
  const matches = getMatches();
  let PJ = 0, PG = 0, PE = 0, PP = 0, GF = 0, GC = 0;
  const finishedMatches = [];

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
    finishedMatches.push({ ...m, our, their });
  });

  const diff = GF - GC;
  const recent = finishedMatches
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map((m) => `<span class="form-dot ${m.our > m.their ? 'is-win' : (m.our === m.their ? 'is-draw' : 'is-loss')}">${m.our > m.their ? 'G' : (m.our === m.their ? 'E' : 'P')}</span>`)
    .join('');

  $('clubStats').innerHTML = `
    <section class="club-overview">
      <article class="club-record">
        <small>Balance</small>
        <strong>${PG}-${PE}-${PP}</strong>
        <span>${PJ} partidos jugados</span>
      </article>
      <article class="club-record">
        <small>Goles</small>
        <strong>${GF}:${GC}</strong>
        <span>${diff >= 0 ? '+' : ''}${diff} diferencia</span>
      </article>
      <article class="club-form">
        <small>Racha</small>
        <div>${recent || '<span class="muted">Sin resultados</span>'}</div>
      </article>
      <div class="club-mini-grid">
        ${[
          ['PJ', PJ], ['PG', PG], ['PE', PE], ['PP', PP], ['GF', GF], ['GC', GC]
        ].map(([k, v]) => `<div class="stat-item"><small>${k}</small><strong>${v}</strong></div>`).join('')}
      </div>
    </section>`;

  const players = getPlayers().sort((a, b) => (a.dorsal || 999) - (b.dorsal || 999));
  const scoreRows = getPlayerScoreRows(players);
  $('squadList').innerHTML = players.length ? players.map((p) => {
    const row = scoreRows.find((item) => item.id === p.id) || {};
    const achievements = getPlayerAchievements(p, scoreRows);
    return `
      <li class="squad-list-item">
        <button type="button" class="squad-card" data-action="open-player" data-player-id="${p.id}">
          <div class="squad-shirt" aria-hidden="true">
            <span>${p.dorsal || '-'}</span>
          </div>
          <div class="squad-card__body">
            <div class="squad-card__top">
              <strong>${escapeHtml(p.name)}</strong>
              <span class="chip">${escapeHtml(p.position || 'N/D')}</span>
            </div>
            <div class="squad-statline">
              <span><strong>${p.stats.goles || 0}</strong> G</span>
              <span><strong>${p.stats.asistencias || 0}</strong> A</span>
              <span><strong>${row.mvp || p.stats.mvps || 0}</strong> MVP</span>
              <span><strong>${p.stats.amarillas || 0}</strong> TA</span>
              <span><strong>${p.stats.rojas || 0}</strong> TR</span>
            </div>
            ${achievements.length ? `<div class="achievement-strip">${achievements.slice(0, 2).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
          </div>
        </button>
      </li>`;
  }).join('') : '<li>No hay jugadores cargados todavía.</li>';

  renderClubPointsRanking(scoreRows);
  renderRivalsBlock();
  renderOfficialLeaguePanel();
}

async function loadMvpData(selectedMatchId) {
  state.mvp.selectedMatchId = selectedMatchId || state.mvp.selectedMatchId;
  state.mvp.votesByPlayerForSelected = {};
  state.mvp.votesByMatch = {};
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
    if (row.match_id) {
      const matchId = String(row.match_id);
      if (!state.mvp.votesByMatch[matchId]) state.mvp.votesByMatch[matchId] = {};
      state.mvp.votesByMatch[matchId][playerId] = (state.mvp.votesByMatch[matchId][playerId] || 0) + 1;
    }
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

  const leaderTotal = Math.max(1, ...ranking.map((p) => Number(p.total || 0)));
  const podium = ranking.slice(0, 3).map((p, index) => `
    <article class="mvp-podium__card is-${index + 1}">
      <span class="mvp-podium__place">${index + 1}</span>
      <strong>${escapeHtml(p.name)}</strong>
      <span>${p.total} MVP</span>
    </article>
  `).join('');

  $('mvpRankingList').innerHTML = `
    <section class="mvp-podium">${podium || '<p class="muted">Sin votos todavía.</p>'}</section>
    <section class="mvp-rank-list">
      ${ranking.map((p, index) => `
        <article class="mvp-rank-row">
          <span class="mvp-rank-row__pos">${index + 1}</span>
          <span class="mvp-rank-row__avatar">${escapeHtml(String(p.name || 'J').charAt(0).toUpperCase() || 'J')}</span>
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <span class="mvp-rank-row__bar"><span style="width:${Math.max(6, Math.round((Number(p.total || 0) / leaderTotal) * 100))}%"></span></span>
          </div>
          <span class="badge">${p.total}</span>
        </article>
      `).join('')}
    </section>
  `;

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
  const slots = (FORMATIONS[formation] || FORMATIONS['1-2-3-1']).slots;
  const normalized = {};
  const usedPlayers = new Set();
  const sourceEntries = Object.entries(assignments || {}).filter(([, playerId]) => playerId && isUuid(playerId));

  slots.forEach((slot) => {
    const playerId = assignments?.[slot];
    if (playerId && isUuid(playerId) && !usedPlayers.has(playerId)) {
      normalized[slot] = playerId;
      usedPlayers.add(playerId);
    }
  });

  sourceEntries.forEach(([sourceSlot, playerId]) => {
    if (usedPlayers.has(playerId)) return;
    const sourceRole = getSlotRole(sourceSlot);
    const targetSlot = slots.find((slot) => !normalized[slot] && getSlotRole(slot) === sourceRole)
      || slots.find((slot) => !normalized[slot] && slot !== 'GK')
      || slots.find((slot) => !normalized[slot]);
    if (targetSlot) {
      normalized[targetSlot] = playerId;
      usedPlayers.add(playerId);
    }
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
  const tacticPanel = $('lineupTacticalPanel');
  if (tacticPanel) tacticPanel.innerHTML = renderTacticalInsight(formation, { title: 'Consejos/tácticas' });
}

function renderAdmin() {
  const adminTab = document.querySelector('.admin-tab');
  const adminView = document.querySelector('[data-view="admin"]');
  const adminMode = isAdmin();
  adminTab?.classList.toggle('hidden', !adminMode);
  adminView?.classList.toggle('hidden', !adminMode);
  if (!adminMode || !adminView) return;

  {
    const matches = getActaMatchOptions();
    const actaMatch = getActaSelectedMatch();
    if (actaMatch && !state.actaEditor.selectedMatchId) resetActaEditorForMatch(actaMatch);
    const pendingPrimary = matches.find((m) => isPendingMatch(m));
    const notice = pendingPrimary
      ? `Acta pendiente: ${formatMatchShort(pendingPrimary)}`
      : 'Sin actas pendientes. Puedes revisar o corregir cualquier partido ya jugado.';
    const homeLabel = actaMatch?.home ? 'Inter' : (actaMatch?.rival || 'Rival');
    const awayLabel = actaMatch?.home ? (actaMatch?.rival || 'Rival') : 'Inter';
    const matchOptions = matches.map((m) => `<option value="${m.id}" ${m.id === state.actaEditor.selectedMatchId ? 'selected' : ''}>${formatMatchLabel(m)}</option>`).join('');

    adminView.innerHTML = `
      <section id="adminActaBlock" class="admin-block admin-acta card card--accent" style="--accent-color: var(--dorado)">
        <div class="admin-section-head">
          <div>
            <h2 class="section-title">Acta del partido</h2>
            <p class="muted">${escapeHtml(notice)}</p>
          </div>
          <span class="acta-pill">Admin</span>
        </div>
        ${matches.length ? `
          <label for="actaMatchSelector">Partido</label>
          <select id="actaMatchSelector" class="input">${matchOptions}</select>
          <div class="acta-score-grid">
            <label><span>${escapeHtml(homeLabel)}</span><input id="actaResultHome" class="input" type="number" min="0" value="${escapeHtml(state.actaEditor.resultHome)}" /></label>
            <label><span>${escapeHtml(awayLabel)}</span><input id="actaResultAway" class="input" type="number" min="0" value="${escapeHtml(state.actaEditor.resultAway)}" /></label>
          </div>
          <div class="acta-panel">
            <div class="acta-panel__head">
              <h3>Goles del Inter</h3>
              <span id="actaGoalsCount" class="badge">0/0</span>
            </div>
            <div id="actaGoalsList" class="acta-list"></div>
          </div>
          <div class="acta-panel">
            <div class="acta-panel__head">
              <h3>Tarjetas</h3>
              <button type="button" id="actaAddCardBtn" class="btn btn-secondary">Añadir tarjeta</button>
            </div>
            <div id="actaCardsList" class="acta-list"></div>
          </div>
          <p id="actaSchemaHint" class="muted"></p>
          <button id="saveActaBtn" type="button" class="btn btn-primary">Publicar acta</button>
        ` : '<p class="muted">No hay partidos UUID de Supabase para crear actas.</p>'}
      </section>

      <section id="lineupEditorSection" class="admin-block admin-lineup card card--accent" style="--accent-color: #4ecf8f">
        <h3 class="section-title">Alineación por partido</h3>
        <label for="lineupMatchSelector">Partido</label>
        <select id="lineupMatchSelector" class="input"></select>
        <div id="lineupFormationToggle" class="formation-toggle">
          ${Object.keys(FORMATIONS).map((formation) => `<button type="button" data-action="set-formation" data-formation="${formation}">${formation}</button>`).join('')}
        </div>
        <div id="lineupTacticalPanel"></div>
        <p id="lineupAdminMessage" class="lineup-message"></p>
        <div id="lineupFieldAdmin" class="lineup-field hidden"></div>
        <label for="lineupSlotSelector">Slot</label>
        <select id="lineupSlotSelector" class="input"></select>
        <label for="lineupPlayerSelectorForSlot">Jugador</label>
        <select id="lineupPlayerSelectorForSlot" class="input"></select>
        <button id="saveLineupBtn" type="button" class="btn btn-primary">Guardar alineación</button>
      </section>

      <section class="admin-block admin-image card card--accent" style="--accent-color: var(--celeste)">
        <h3 class="section-title">Imagen convocatoria</h3>
        <p class="muted">Formato 1080x1350 con escudo del club, rival, fecha, convocados y alineación si está publicada.</p>
        <select id="adminImageMatchSelector" class="input">${getMatches().filter((m) => isUuid(m.id)).map((m) => `<option value="${m.id}">${formatMatchLabel(m)}</option>`).join('')}</select>
        <button id="adminImageBtn" class="btn btn-gold">Generar imagen convocatoria</button>
      </section>
    `;

    if (actaMatch && state.actaEditor.loadedMatchId !== actaMatch.id) {
      hydrateActaEditorFromDb(actaMatch.id).then(() => {
        if ((window.location.hash.replace('#', '') || 'home') === 'admin') renderAdmin();
      });
    }

    $('actaMatchSelector')?.addEventListener('change', async (e) => {
      await hydrateActaEditorFromDb(e.target.value, { force: true });
      renderAdmin();
    });
    $('actaResultHome')?.addEventListener('input', () => { readActaResultFromInputs(); renderActaDynamicLists(); });
    $('actaResultAway')?.addEventListener('input', () => { readActaResultFromInputs(); renderActaDynamicLists(); });
    $('actaGoalsList')?.addEventListener('change', (e) => {
      const rowEl = e.target.closest('[data-goal-index]');
      if (!rowEl) return;
      const index = Number(rowEl.dataset.goalIndex);
      const row = state.actaEditor.goalRows[index];
      if (!row) return;
      const field = e.target.dataset.actaField;
      if (field === 'scorerType') {
        row.scorerType = e.target.value;
        if (row.scorerType !== 'player') row.scorerId = '';
      }
      if (field === 'scorerId') row.scorerId = e.target.value;
      if (field === 'assistId') row.assistId = e.target.value;
      renderActaDynamicLists();
    });
    $('actaAddCardBtn')?.addEventListener('click', () => {
      state.actaEditor.cardRows.push({ playerId: '', cardType: 'yc' });
      renderActaDynamicLists();
    });
    $('actaCardsList')?.addEventListener('change', (e) => {
      const rowEl = e.target.closest('[data-card-index]');
      if (!rowEl) return;
      const index = Number(rowEl.dataset.cardIndex);
      const row = state.actaEditor.cardRows[index];
      if (!row) return;
      if (e.target.dataset.actaField === 'cardPlayerId') row.playerId = e.target.value;
      if (e.target.dataset.actaField === 'cardType') row.cardType = e.target.value;
    });
    $('actaCardsList')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="acta-remove-card"]');
      if (!btn) return;
      state.actaEditor.cardRows.splice(Number(btn.dataset.index), 1);
      renderActaDynamicLists();
    });
    $('saveActaBtn')?.addEventListener('click', saveActa);

    $('lineupMatchSelector')?.addEventListener('change', (e) => { hydrateLineupEditor(e.target.value, { force: true }); renderLineupEditor(); });
    $('lineupSlotSelector')?.addEventListener('change', (e) => { state.lineupEditor.selectedSlot = e.target.value; renderLineupEditor(); });
    $('lineupPlayerSelectorForSlot')?.addEventListener('change', (e) => { assignLineupPlayer(state.lineupEditor.selectedSlot, e.target.value); renderLineupEditor(); });
    $('saveLineupBtn')?.addEventListener('click', async () => {
      const matchId = state.lineupEditor.selectedMatchId;
      const formation = state.lineupEditor.formation;
      const assignments = normalizeAssignmentsForFormation(state.lineupEditor.assignments, formation);
      const ok = await saveLineupForMatch(matchId, assignments);
      if (!ok) return;
      hydrateLineupEditor(matchId, { force: true });
      renderLineupEditor();
      renderHome();
      showToast('Alineación guardada', 'success');
    });
    $('adminImageBtn')?.addEventListener('click', () => {
      const id = $('adminImageMatchSelector')?.value || state.selectedMatchId || getUpcomingMatch?.()?.id;
      if (!id) return showToastOrAlert('No hay partido seleccionado ni próximo partido disponible', 'error');
      generateInstagramPoster(id);
    });

    renderLineupEditor();
    renderActaDynamicLists();
    return;
  }

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
    state.homeAttendanceSummary = { matchId: null, status: 'idle', counts: null };

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
      button.textContent = previousLabel || 'Actualizar';
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
  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Actualizando...';

  try {
    await refreshSessionData({ source: 'manual', showSuccessToast: false, useRefreshButton: false });
    await clearAppCacheAndReload();
  } catch (error) {
    console.error('[app-refresh] error', error);
    showToast(error.message || 'No se pudo actualizar la app', 'error');
    button.disabled = false;
    button.textContent = previousLabel || 'Actualizar app';
  }
}

async function clearAppCacheAndReload() {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('inter-app-cache'))
      .map((key) => caches.delete(key)));
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_APP_CACHE' });
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (registration) => {
      try {
        await registration.update();
        (registration.waiting || registration.installing)?.postMessage({ type: 'SKIP_WAITING' });
      } catch (error) {
        console.warn('[app-refresh] service worker update failed', error);
      }
    }));
  }

  showToast('App actualizada. Recargando...', 'success');
  await new Promise((resolve) => setTimeout(resolve, 450));
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('app_update', Date.now().toString());
  window.location.replace(nextUrl.toString());
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

  ctx.save();
  const rivalGradient = ctx.createLinearGradient(850, 82, 982, 214);
  rivalGradient.addColorStop(0, '#163f65');
  rivalGradient.addColorStop(1, '#4da3ff');
  ctx.fillStyle = rivalGradient;
  ctx.beginPath();
  ctx.arc(914, 148, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,.8)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '800 42px Arial';
  ctx.fillText(getTeamInitials(opponent), 914, 163);
  ctx.restore();

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
    const lineupAssignments = Object.fromEntries((lineupRows || [])
      .filter((row) => row?.position_slot && row?.player_id)
      .map((row) => [String(row.position_slot), String(row.player_id)]));
    const posterFormation = detectFormation(lineupAssignments);
    const formationConfig = FORMATIONS[posterFormation] || FORMATIONS['1-2-3-1'];
    const slotCoords = Object.fromEntries(formationConfig.slots.map((slot) => {
      const pos = formationConfig.positions[slot] || { x: 50, y: 50 };
      return [slot, [408 + (pos.x / 100) * 592, 666 + (pos.y / 100) * 478]];
    }));
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

function openPlayerModal(playerId) {
  const player = getPlayers().find((item) => item.id === playerId);
  if (!player) return;
  const rows = getPlayerScoreRows();
  const row = rows.find((item) => item.id === player.id) || {};
  const achievements = getPlayerAchievements(player, rows);
  const content = $('playerModalContent');
  if (!content) return;

  content.innerHTML = `
    <section class="player-modal-hero">
      <div class="player-modal-shirt">
        <span>${player.dorsal || '-'}</span>
      </div>
      <div>
        <span class="player-modal-eyebrow">Ficha jugador</span>
        <h3>${escapeHtml(player.name)}</h3>
        <p>${escapeHtml(player.position || 'N/D')}</p>
      </div>
    </section>
    <section class="player-modal-stats">
      ${[
        ['Goles', player.stats.goles || 0],
        ['Asist.', player.stats.asistencias || 0],
        ['MVP', row.mvp || player.stats.mvps || 0],
        ['TA', player.stats.amarillas || 0],
        ['TR', player.stats.rojas || 0],
        ['Conv.', row.confirmed || 0],
        ['Puntos', row.points || 0]
      ].map(([label, value]) => `<article><small>${label}</small><strong>${value}</strong></article>`).join('')}
    </section>
    <section class="player-modal-achievements">
      <h4>Logros</h4>
      ${achievements.length
        ? `<div>${achievements.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`
        : '<p class="muted">Aún no hay logros automáticos con los datos actuales.</p>'}
    </section>
  `;

  $('playerModal')?.showModal();
}

function openMatchModal(matchId) {
  const m = getMatches().find((x) => x.id === matchId);
  if (!m) return;
  const [homeGoals, awayGoals] = getMatchResultTuple(m);
  const hasResult = homeGoals != null && awayGoals != null;
  const isFuture = new Date(m.date) >= new Date();
  const status = hasResult ? 'FINALIZADO' : (isFuture ? 'PRÓXIMO' : 'SIN ACTA');
  const jornada = m.jornada || m.matchday || m.round || '';
  const localTeam = m.home ? 'Inter F7' : (m.rival || 'Rival');
  const awayTeam = m.home ? (m.rival || 'Rival') : 'Inter F7';
  const eventSummary = getMatchEventSummary(m);
  const mvpLeaders = getMatchMvpLeaders(m.id);
  const recentForm = getRecentInterForm(5);
  const textualResult = m.result_text || m.resultText || m.resultado_texto || '';
  const resultLabel = hasResult ? `${homeGoals} - ${awayGoals}` : '-';

  $('modalHeader').innerHTML = `
    <p class="match-modal-meta-top">${jornada ? `<span class="badge">${escapeHtml(jornada)}</span>` : ''}<span>${escapeHtml(formatDate(m.date))}</span></p>
    <p class="match-modal-status ${hasResult ? 'is-final' : 'is-pending'}">${status}</p>
  `;

  $('modalHero').innerHTML = `
    <div class="team-side team-side--local">
      <p class="team-name">${escapeHtml(localTeam)}</p>
      <img class="team-shield team-logo" src="${getTeamLogo(localTeam)}" alt="Escudo ${escapeHtml(localTeam)}" />
    </div>
    <p class="match-score" aria-label="Marcador">${resultLabel}</p>
    <div class="team-side team-side--away">
      <img class="team-shield team-logo" src="${getTeamLogo(awayTeam)}" alt="Escudo ${escapeHtml(awayTeam)}" />
      <p class="team-name">${escapeHtml(awayTeam)}</p>
    </div>
  `;

  $('modalSummary').innerHTML = `
    <section class="match-compare">
      <article>
        <small>Inter</small>
        <strong>${hasResult ? (m.home ? homeGoals : awayGoals) : '-'}</strong>
        <span>${recentForm.length ? recentForm.map((item) => `<i class="form-dot mini ${item === 'G' ? 'is-win' : (item === 'E' ? 'is-draw' : 'is-loss')}">${item}</i>`).join('') : 'Sin racha'}</span>
      </article>
      <article>
        <small>${escapeHtml(m.rival || 'Rival')}</small>
        <strong>${hasResult ? (m.home ? awayGoals : homeGoals) : '-'}</strong>
        <span>${escapeHtml(m.home ? 'Inter local' : 'Inter visitante')}</span>
      </article>
    </section>
    <p><strong>Localía:</strong> ${m.home ? 'Casa' : 'Fuera'} · <strong>Campo:</strong> ${escapeHtml(m.venue || 'Velòdrom F7')}</p>
    ${textualResult ? `<p><strong>Resumen:</strong> ${escapeHtml(textualResult)}</p>` : ''}
    ${eventSummary.goals.length ? `<div class="inter-scorers"><h4>Goles del Inter</h4><ul>${eventSummary.goals.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>` : ''}
    ${eventSummary.assists.length ? `<p><strong>Asistencias:</strong> ${escapeHtml(eventSummary.assists.join(', '))}</p>` : ''}
    ${mvpLeaders.length ? `<p><strong>MVP:</strong> ${escapeHtml(mvpLeaders.map((item) => item.name).join(', '))}</p>` : ''}
    ${eventSummary.cards.length ? `<p><strong>Tarjetas:</strong> ${escapeHtml(eventSummary.cards.join(', '))}</p>` : ''}
  `;

  renderLineupForMatch('lineupFieldModal', 'lineupModalMessage', m.id);

  const adminZone = $('modalAdminEdit');
  const adminMode = isAdmin();
  adminZone.classList.toggle('hidden', !adminMode);
  $('openLineupEditorFromModalBtn').classList.toggle('hidden', !adminMode);
  $('openLineupEditorFromModalBtn').textContent = 'Editar alineación';
  $('openPostMatchFromModalBtn').textContent = 'Abrir acta';
  $('openPostMatchFromModalBtn').onclick = () => openAdminActaForMatch(m.id);
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
  const mvpDefaultMatch = isUuid(getUpcomingMatch()?.id)
    ? getUpcomingMatch()
    : getMatches().find((m) => isUuid(m.id));
  await loadMvpData(state.mvp.selectedMatchId || mvpDefaultMatch?.id || null);
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

    if (btn.dataset.action === 'open-player') {
      openPlayerModal(btn.dataset.playerId);
      return;
    }

    if (btn.dataset.action === 'official-tab') {
      state.officialLeagueTab = btn.dataset.tab || 'standings';
      renderOfficialLeaguePanel();
      return;
    }

    if (btn.dataset.action === 'open-official') {
      const url = btn.dataset.url || OFFICIAL_LINKS.standings;
      window.open(url, '_blank', 'noopener');
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
      state.homeAttendanceSummary = { matchId: null, status: 'idle', counts: null };
      renderConvocatoria();
      renderHome();
      showToast('Asistencia guardada');
    }

    if (btn.dataset.action === 'open-match') {
      openMatchModal(btn.dataset.id);
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

  $('closeModalBtn')?.addEventListener('click', () => $('matchModal')?.close());
  $('closePlayerModalBtn')?.addEventListener('click', () => $('playerModal')?.close());
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
