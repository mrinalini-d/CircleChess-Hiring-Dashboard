// =========================================================
// CircleChess Hiring Dashboard — Weekly Slots
// =========================================================
// This calls the same CircleChess APIs as the original NocoBase
// script. It shows one combined weekly grid: every coach who has
// a slot on a given day/time shows up as a name in that cell.
// Cells with NO coach at all are clearly marked "Open".
// =========================================================

const API_BASE_URL = (typeof location !== 'undefined' && (location.hostname === '127.0.0.1' || location.hostname === 'localhost'))
  ? 'http://127.0.0.1:3001'
  : '';
const NOCOBASE_API_KEY = CONFIG.NOCOBASE_API_KEY;

// ---------------------------------------------------------
// Low-level API helper (same pattern as the original script)
// ---------------------------------------------------------
function buildQueryString(params) {
  return Object.keys(params || {})
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

async function callApi(endpoint, params = {}) {
  const queryString = buildQueryString(params);
  const fullUrl = `${API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'X-NocoBase-Key': NOCOBASE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${endpoint}`);
  }
  return response.json();
}

// ---------------------------------------------------------
// State
// ---------------------------------------------------------
let weekOffset = 0;           // 0 = this week, 1 = next week, -1 = last week
let allCoaches = [];          // full coach list (id, name)
let weeklyByCoach = {};        // coachId -> /coach-weekly-slots/ response
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PEAK_RANGES = [[3 * 60, 7 * 60], [16 * 60, 20 * 60]]; // 3-7 AM, 4-8 PM IST, in minutes

// ---------------------------------------------------------
// DOM refs
// ---------------------------------------------------------
const weeklyHead = document.getElementById('weeklyHead');
const weeklyBody = document.getElementById('weeklyBody');
const weekRangeLabel = document.getElementById('weekRangeLabel');
const loadingBar = document.getElementById('loadingBar');
const prevWeekBtn = document.getElementById('prevWeekBtn');
const nextWeekBtn = document.getElementById('nextWeekBtn');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');

const statTotal = document.getElementById('statTotal');
const statFilled = document.getElementById('statFilled');
const statFilledPct = document.getElementById('statFilledPct');
const statOpen = document.getElementById('statOpen');
const statOpenPct = document.getElementById('statOpenPct');
const statPeakOpen = document.getElementById('statPeakOpen');

const slotModalOverlay = document.getElementById('slotModalOverlay');
const slotModalTitle = document.getElementById('slotModalTitle');
const slotModalBody = document.getElementById('slotModalBody');
const slotModalClose = document.getElementById('slotModalClose');

// ---------------------------------------------------------
// Date helpers
// ---------------------------------------------------------
function getWeekStartDateStr(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Align to Monday of the current week first
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMonday + offset * 7);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function updateWeekRangeLabel() {
  const startStr = getWeekStartDateStr(weekOffset);
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  weekRangeLabel.textContent =
    start.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' – ' +
    end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseClockMinutes(hhmm) {
  if (!hhmm) return null;
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function isPeakLabel(slotLabel) {
  const parts = String(slotLabel || '').split(/\s*-\s*/);
  if (parts.length !== 2) return false;
  const start = parseClockMinutes(parts[0]);
  const end = parseClockMinutes(parts[1]);
  if (start === null || end === null) return false;
  return PEAK_RANGES.some(([rs, re]) => start >= rs && end <= re);
}

// ---------------------------------------------------------
// Load coach list, then load each coach's weekly slots
// ---------------------------------------------------------
async function loadAllCoaches() {
  const data = await callApi('/subscription/v1/coach-search/', { q: '', limit: 500 });
  if (!data || !data.success) throw new Error((data && data.error) || 'Failed to load coach list.');
  return data.coaches || [];
}

async function loadWeeklySlotsForAllCoaches() {
  const weekParams = { slot_minutes: '60' };
  if (weekOffset !== 0) weekParams.start_date = getWeekStartDateStr(weekOffset);

  weeklyByCoach = {};

  // Fetch in small batches so we don't fire 100+ requests at once
  const BATCH_SIZE = 8;
  for (let i = 0; i < allCoaches.length; i += BATCH_SIZE) {
    const batch = allCoaches.slice(i, i + BATCH_SIZE);
    loadingBar.textContent = `Loading availability… (${Math.min(i + BATCH_SIZE, allCoaches.length)} / ${allCoaches.length} coaches)`;
    await Promise.all(batch.map(async (c) => {
      try {
        const data = await callApi('/subscription/v1/coach-weekly-slots/', Object.assign({}, weekParams, { coach_id: c.id }));
        if (data && data.success) weeklyByCoach[c.id] = data;
      } catch (e) {
        console.error('Failed to load slots for coach', c.id, e);
      }
    }));
  }
}

// ---------------------------------------------------------
// Build the combined grid: date+slotLabel -> [{coachId, coachName, pct}]
// Also collects the full set of dates and time labels across all coaches.
// ---------------------------------------------------------
function buildGridData() {
  const dateMeta = {};   // date -> { date, weekday_name }
  const timeLabels = new Set();
  const cellMap = {};    // "date|label" -> [{coachId, coachName, pct}]

  allCoaches.forEach((c) => {
    const data = weeklyByCoach[c.id];
    if (!data || !data.slots) return;
    data.slots.forEach((s) => {
      dateMeta[s.date] = { date: s.date, weekday_name: s.weekday_name };
      timeLabels.add(s.slot_label);
      const key = s.date + '|' + s.slot_label;
      if (!cellMap[key]) cellMap[key] = [];
      const pct = s.recurring_pct != null ? s.recurring_pct : 100;
      cellMap[key].push({ coachId: c.id, coachName: c.name, pct });
    });
  });

  const dates = Object.keys(dateMeta).sort().map((d) => dateMeta[d]);
  const sortedLabels = Array.from(timeLabels).sort((a, b) => {
    const aStart = parseClockMinutes(a.split('-')[0]) || 0;
    const bStart = parseClockMinutes(b.split('-')[0]) || 0;
    return aStart - bStart;
  });

  return { dates, timeLabels: sortedLabels, cellMap };
}

// ---------------------------------------------------------
// Render
// ---------------------------------------------------------
function renderWeeklyGrid() {
  const { dates, timeLabels, cellMap } = buildGridData();

  if (!dates.length || !timeLabels.length) {
    weeklyHead.innerHTML = '';
    weeklyBody.innerHTML = '<tr><td class="empty-state">No slot data found for this week.</td></tr>';
    updateStats(0, 0, 0);
    return;
  }

  // Head row
  weeklyHead.innerHTML = '<tr><th class="time-col">Time (IST)</th>' +
    dates.map((d) => {
      const dayDate = new Date(d.date + 'T00:00:00');
      return `<th>${d.weekday_name}<br><span class="head-date">${dayDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></th>`;
    }).join('') +
    '</tr>';

  let totalSlots = 0;
  let filledSlots = 0;
  let openSlots = 0;
  let peakOpenSlots = 0;

  const rows = timeLabels.map((label) => {
    const peak = isPeakLabel(label);
    const cells = dates.map((d) => {
      const key = d.date + '|' + label;
      const coaches = cellMap[key] || [];
      totalSlots += 1;

      if (!coaches.length) {
        openSlots += 1;
        if (peak) peakOpenSlots += 1;
        return `<td class="slot-cell ${peak ? 'peak-col' : ''}"><span class="slot-pill open" data-date="${d.date}" data-label="${label}">Open</span></td>`;
      }

      filledSlots += 1;
      const names = coaches.map((c) => {
        const cls = c.pct >= 100 ? 'filled' : 'partial';
        const pctTxt = c.pct < 100 ? ` <em>(${c.pct}%)</em>` : '';
        return `<span class="coach-chip ${cls}" data-date="${d.date}" data-label="${label}" data-coach-id="${c.coachId}">${c.coachName}${pctTxt}</span>`;
      }).join('');

      return `<td class="slot-cell ${peak ? 'peak-col' : ''}">${names}</td>`;
    }).join('');

    return `<tr><td class="time-col">${label}</td>${cells}</tr>`;
  }).join('');

  weeklyBody.innerHTML = rows;
  updateStats(totalSlots, filledSlots, peakOpenSlots);

  // Click a cell to see detail
  weeklyBody.querySelectorAll('.slot-pill, .coach-chip').forEach((el) => {
    el.addEventListener('click', () => openSlotModal(el.dataset.date, el.dataset.label));
  });
}

function updateStats(total, filled, peakOpen) {
  const open = total - filled;
  statTotal.textContent = String(total);
  statFilled.innerHTML = String(filled) + ' <span class="stat-pct">(' + (total ? Math.round((filled / total) * 100) : 0) + '%)</span>';
  statOpen.innerHTML = String(open) + ' <span class="stat-pct">(' + (total ? Math.round((open / total) * 100) : 0) + '%)</span>';
  statPeakOpen.textContent = String(peakOpen);
}

// ---------------------------------------------------------
// Slot detail modal — shows who IS and ISN'T available for that exact slot
// ---------------------------------------------------------
function renderCoachList(items, emptyMessage) {
  if (!items || !items.length) return `<div class="empty-state">${emptyMessage}</div>`;
  return '<div class="modal-coach-list">' + items.map((name) =>
    `<div class="modal-coach-item">${name}</div>`
  ).join('') + '</div>';
}

function openSlotModal(date, label) {
  slotModalTitle.textContent = `${label} — ${date}`;
  const { cellMap } = buildGridData();
  const key = date + '|' + label;
  const coaches = cellMap[key] || [];

  const availableNames = coaches.map((c) => c.coachName + (c.pct < 100 ? ` (${c.pct}%)` : ''));
  const availableIds = new Set(coaches.map((c) => c.coachId));
  const unavailableNames = allCoaches.filter((c) => !availableIds.has(c.id)).map((c) => c.name);

  slotModalBody.innerHTML =
    `<h4 class="modal-section-title">Available (${availableNames.length})</h4>` +
    renderCoachList(availableNames, 'No coach available for this slot.') +
    `<h4 class="modal-section-title" style="margin-top:18px;">Not available (${unavailableNames.length})</h4>` +
    renderCoachList(unavailableNames, 'Every coach is available for this slot.');

  slotModalOverlay.style.display = 'flex';
}

slotModalClose.addEventListener('click', () => { slotModalOverlay.style.display = 'none'; });
slotModalOverlay.addEventListener('click', (e) => {
  if (e.target === slotModalOverlay) slotModalOverlay.style.display = 'none';
});

// ---------------------------------------------------------
// Main load flow
// ---------------------------------------------------------
async function loadDashboard() {
  refreshBtn.disabled = true;
  refreshIcon.classList.add('spinning');
  loadingBar.textContent = 'Loading coach list…';
  updateWeekRangeLabel();

  try {
    if (!allCoaches.length) {
      allCoaches = await loadAllCoaches();
    }
    await loadWeeklySlotsForAllCoaches();
    renderWeeklyGrid();
    loadingBar.textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch (error) {
    console.error('loadDashboard error:', error);
    weeklyBody.innerHTML = `<tr><td class="empty-state">Error loading data: ${error.message || error}</td></tr>`;
    loadingBar.textContent = 'Error: ' + (error.message || error);
  } finally {
    refreshBtn.disabled = false;
    refreshIcon.classList.remove('spinning');
  }
}

// ---------------------------------------------------------
// Events
// ---------------------------------------------------------
prevWeekBtn.addEventListener('click', () => { weekOffset -= 1; loadDashboard(); });
nextWeekBtn.addEventListener('click', () => { weekOffset += 1; loadDashboard(); });
refreshBtn.addEventListener('click', () => { loadDashboard(); });

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
loadDashboard();
