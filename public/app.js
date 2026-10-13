import {calculate, sheet as readSheet} from './local-api.js';
const $ = id => document.getElementById(id);
const form = $('inputs');
const advanced = {};
const selections = {};
const groupViews = [];
let groupsRendered = false;
let sheetNames = {};
let measureRows = [];
let measureFilter = 'all';
let calculationSequence = 0;
let lastUpdated = null;
const safe = value => value === null || value === undefined || value === '' ? 'Unavailable' : String(value);
const num = value => typeof value === 'number' ? new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value) : safe(value);
const clean = value => String(value ?? '').toLocaleLowerCase();

function pending() {
  $('control-count').textContent = Object.keys(advanced).length + ' overrides';
  $('control-state').textContent = Object.keys(advanced).length ? 'Changes not yet applied' : 'No advanced changes';
  $('recalculate').classList.toggle('attention', Object.keys(advanced).length > 0);
}

function createField(field) {
  const label = document.createElement('label');
  label.className = 'field-card';
  const title = document.createElement('span'); title.className = 'field-title'; title.textContent = field.label;
  const hint = document.createElement('small'); hint.textContent = field.sheet + ' · ' + field.cell;
  let control;
  if (field.type === 'select') {
    control = document.createElement('select');
    for (const choice of field.options) control.add(new Option(choice || 'No category selected', choice));
    if (field.default !== null && field.default !== undefined && !field.options.includes(field.default)) control.add(new Option(field.default, field.default));
  } else {
    control = document.createElement('input');
    control.type = field.type === 'text' ? 'text' : 'number';
    if (field.type !== 'text') { control.min = '0'; control.max = '100000'; control.step = 'any'; }
  }
  control.value = Object.hasOwn(advanced, field.id) ? advanced[field.id] : field.default ?? '';
  control.addEventListener('change', () => {
    const original = field.default ?? '';
    if (String(control.value) === String(original)) delete advanced[field.id];
    else advanced[field.id] = control.value;
    control.classList.toggle('edited', Object.hasOwn(advanced, field.id));
    pending();
    if ($('edited-only').checked) filterControls();
  });
  control.classList.toggle('edited', Object.hasOwn(advanced, field.id));
  label.append(title, hint, control);
  return label;
}
function populateGroup(view) {
  if (view.loaded) return;
  view.grid.replaceChildren(...view.group.fields.map(createField));
  view.loaded = true;
}
function filterControls() {
  const query = clean($('control-search').value).trim();
  const changedOnly = $('edited-only').checked;
  let visible = 0;
  for (const view of groupViews) {
    const matches = view.group.fields.filter(field =>
      (!changedOnly || Object.hasOwn(advanced, field.id)) &&
      (!query || clean(field.label + ' ' + field.cell + ' ' + field.sheet).includes(query)));
    const searching = Boolean(query || changedOnly);
    view.details.hidden = searching && matches.length === 0;
    view.summary.textContent = view.group.name + ' · ' + (searching ? matches.length + ' matching / ' : '') + view.group.fields.length + ' controls';
    view.count.textContent = view.group.fields.filter(field => Object.hasOwn(advanced, field.id)).length + ' changed';
    visible += matches.length;
    if (searching && matches.length) { view.details.open = true; populateGroup(view); }
    if (view.loaded) for (const [i, child] of [...view.grid.children].entries()) {
      child.hidden = searching && !matches.includes(view.group.fields[i]);
    }
  }
  $('control-results').textContent = query || changedOnly ? visible + ' matching controls' : 'Choose a section, or search across all workbook controls.';
}
function buildGroups(groups) {
  for (const group of groups) {
    const details = document.createElement('details'); details.className = 'control-group';
    const summary = document.createElement('summary'); summary.textContent = group.name + ' · ' + group.fields.length + ' controls';
    const count = document.createElement('span'); count.className = 'group-count'; count.textContent = '0 changed';
    summary.append(count);
    const note = document.createElement('p'); note.className = 'muted'; note.textContent = group.note;
    const grid = document.createElement('div'); grid.className = 'control-grid';
    const view = {group, details, summary, count, grid, loaded:false};
    details.addEventListener('toggle', () => { if (details.open) { populateGroup(view); filterControls(); } });
    details.append(summary, note, grid);
    groupViews.push(view); $('groups').append(details);
  }
  $('control-search').addEventListener('input', filterControls);
  $('edited-only').addEventListener('change', filterControls);
  $('recalculate').addEventListener('click', update);
  $('reset-overrides').addEventListener('click', () => {
    for (const key of Object.keys(advanced)) delete advanced[key];
    for (const view of groupViews) if (view.loaded) for (const [i, label] of [...view.grid.children].entries()) {
      label.querySelector('input,select').value = view.group.fields[i].default ?? '';
      label.querySelector('input,select').classList.remove('edited');
    }
    pending(); filterControls(); update();
  });
  groupsRendered = true;
  filterControls(); pending();
}

function measureKind(item) {
  const status = String(item.status ?? '');
  if (/🟢\s*RECOMMENDED/i.test(status)) return 'recommended';
  if (/NO-REGRET/i.test(status)) return 'no-regret';
  if (/DATA NEEDED/i.test(status)) return 'needed';
  return 'not-recommended';
}
const measureOrder = ['recommended', 'no-regret', 'needed', 'not-recommended'];
const measureTitles = {
  recommended: 'Recommended by the workbook',
  'no-regret': 'Preventive / no-regret options',
  needed: 'More field data needed',
  'not-recommended': 'Not recommended for these inputs'
};
function showMeasures() {
  const query = clean($('measure-search').value).trim();
  const filtered = measureRows.filter(item =>
    (measureFilter === 'all' || measureFilter === 'recommended' && measureKind(item) === 'recommended' || measureFilter === 'selected' && selections[item.row]) &&
    (!query || clean(item.name + ' ' + item.status + ' ' + item.goal + ' ' + item.condition).includes(query)));
  $('all-count').textContent = measureRows.length;
  $('recommended-count').textContent = measureRows.filter(item => measureKind(item) === 'recommended').length;
  $('selected-count').textContent = measureRows.filter(item => selections[item.row]).length;
  $('measure-count').textContent = filtered.length + ' of ' + measureRows.length + ' measures';
  $('measure-empty').hidden = filtered.length > 0;
  const ordered = filtered.map((item, index) => ({item, index})).sort((a, b) =>
    measureOrder.indexOf(measureKind(a.item)) - measureOrder.indexOf(measureKind(b.item)) || a.index - b.index);
  const entries = [];
  let lastKind = null;
  for (const {item} of ordered) {
    const kind = measureKind(item);
    if (kind !== lastKind) {
      const heading = document.createElement('h3'); heading.className = 'measure-group-title ' + kind;
      heading.textContent = measureTitles[kind] + ' · ' + ordered.filter(entry => measureKind(entry.item) === kind).length;
      entries.push(heading); lastKind = kind;
    }
    const card = document.createElement('article');
    card.classList.add('measure-card', measureKind(item));
    if (selections[item.row]) card.classList.add('is-selected');
    const head = document.createElement('div'); head.className = 'measure-head';
    const title = document.createElement('strong'); title.textContent = item.name;
    const status = document.createElement('p'); status.className = 'measure-status'; status.textContent = safe(item.status);
    const note = document.createElement('p'); note.className = 'measure-context'; note.textContent = safe(item.goal) + ' · ' + safe(item.condition);
    const mechanism = document.createElement('p'); mechanism.className = 'mechanism'; mechanism.textContent = safe(item.mechanism);
    const label = document.createElement('label'); label.className = 'choose-measure';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selections[item.row] === true;
    checkbox.addEventListener('change', () => { selections[item.row] = checkbox.checked; update(); });
    label.append(checkbox, document.createTextNode(' Add to action plan'));
    head.append(title); card.append(head, status, note, mechanism, label); entries.push(card);
  }
  $('catalogue').replaceChildren(...entries);
}
function renderMeasures(diagnosis) {
  measureRows = diagnosis.measures;
  $('selected-measures').replaceChildren();
  if (!diagnosis.selected.length) $('selected-measures').textContent = 'No measures selected yet.';
  else for (const item of diagnosis.selected) {
    const chip = document.createElement('span'); chip.className = 'selected-chip'; chip.textContent = item.name;
    $('selected-measures').append(chip);
  }
  $('warnings').replaceChildren(...diagnosis.warnings.map(w => {
    const entry = document.createElement('p');
    const state = document.createElement('strong'); state.textContent = safe(w.status) + ' · ';
    entry.append(state, document.createTextNode(safe(w.label) + ' — ' + safe(w.detail))); return entry;
  }));
  showMeasures();
}
for (const button of document.querySelectorAll('.filter')) button.addEventListener('click', () => {
  measureFilter = button.dataset.filter;
  for (const candidate of document.querySelectorAll('.filter')) {
    const active = candidate === button;
    candidate.classList.toggle('active', active); candidate.setAttribute('aria-pressed', String(active));
  }
  showMeasures();
});
$('measure-search').addEventListener('input', showMeasures);

function setupSheets(worksheets, files) {
  sheetNames = worksheets;
  const book = $('book-view');
  for (const [key, name] of Object.entries(files)) {
    book.add(new Option(name, key));
    const link = document.createElement('a'); link.href = new URL('./models/' + encodeURIComponent(name), document.baseURI).href; link.textContent = 'Download ' + name;
    $('downloads').append(link);
  }
  book.addEventListener('change', selectSheets); selectSheets();
  $('open-sheet').addEventListener('click', openSheet);
}
function selectSheets() {
  const select = $('sheet-view'); select.replaceChildren();
  for (const name of sheetNames[$('book-view').value] || []) select.add(new Option(name, name));
}
async function openSheet() {
  const book = $('book-view').value, sheet = $('sheet-view').value, target = $('sheet-table');
  target.textContent = 'Loading sheet…';
  try {
    const data = await readSheet(book, sheet), table = document.createElement('table');
    const columnIndex = address => [...address.match(/^[A-Z]+/)[0]].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0);
    const maxColumn = Math.max(1, ...data.rows.flatMap(row => row.cells.map(cell => columnIndex(cell.address))));
    const letters = index => { let label = ''; while (index) { index--; label = String.fromCharCode(65 + index % 26) + label; index = Math.floor(index / 26); } return label; };
    const head = document.createElement('thead'), header = document.createElement('tr');
    header.append(document.createElement('th'));
    for (let column = 1; column <= maxColumn; column++) { const th = document.createElement('th'); th.textContent = letters(column); header.append(th); }
    head.append(header); table.append(head);
    const body = document.createElement('tbody');
    for (const row of data.rows) {
      const tr = document.createElement('tr'), no = document.createElement('th'); no.textContent = row.number; tr.append(no);
      const values = new Map(row.cells.map(cell => [columnIndex(cell.address), cell]));
      for (let column = 1; column <= maxColumn; column++) {
        const td = document.createElement('td'), cell = values.get(column);
        if (cell) { const addr = document.createElement('small'); addr.textContent = cell.address; const text = document.createElement('div'); text.textContent = cell.value; td.append(addr, text); }
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body); target.replaceChildren(table);
  } catch (error) { target.textContent = error.message; }
}

function graph(years, starting, threshold) {
  const points = [{year:0, ece:starting}, ...years].filter(point => typeof point.ece === 'number');
  if (points.length < 2) { $('graph').textContent = 'Projection unavailable for these inputs.'; return; }
  const min = Math.max(0, Math.floor(Math.min(...points.map(point => point.ece), threshold ?? Infinity)) - 1);
  const max = Math.ceil(Math.max(...points.map(point => point.ece), threshold ?? 0)) + 1;
  const y = value => 190 - (value - min) / (max - min) * 155;
  const x = index => 48 + index * 75;
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index)} ${y(point.ece)}`).join(' ');
  const target = typeof threshold === 'number' ? `<line x1="48" y1="${y(threshold)}" x2="798" y2="${y(threshold)}" stroke="#bd8e60" stroke-dasharray="5 5"/><text x="805" y="${y(threshold) + 4}" fill="#9b7950" font-size="11">target</text>` : '';
  $('graph').innerHTML = `<svg viewBox="0 0 850 230" role="img" aria-label="Projected soil salinity by year"><line x1="48" y1="190" x2="798" y2="190" stroke="#d8e4d9"/>${target}<path d="${line}" fill="none" stroke="#2c7452" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.ece)}" r="4" fill="#2c7452"/><text x="${x(index)}" y="${Math.max(13, y(point.ece) - 12)}" text-anchor="middle" fill="#3e6451" font-size="11">${num(point.ece)}</text><text x="${x(index)}" y="210" text-anchor="middle" fill="#81958a" font-size="11">${index ? 'Y' + index : 'Start'}</text>`).join('')}</svg>`;
}

async function update() {
  const sequence = ++calculationSequence;
  $('status').textContent = 'Calculating…';
  const input = Object.fromEntries(new FormData(form).entries());
  input.fields = {...advanced}; input.selections = {...selections};
  try {
    const data = await calculate(input);
    if (sequence !== calculationSequence) return;
    const {diagnosis:d, scenario:s, balance:b} = data.result;
    if ($('crop').options.length === 1) {
      $('crop').replaceChildren(); for (const crop of data.crops) $('crop').add(new Option(crop, crop));
    }
    $('crop').value = input.crop || 'Barley';
    $('classification').textContent = safe(d.classification);
    for (const key of ['salinity','sodicity','water','groundwater']) $(key).textContent = safe(d[key]);
    $('completeness').textContent = safe(d.completeness) + ' · Diagnosis based on the measurements entered above.';
    const missing = Object.entries(data.values).filter(([key, value]) => key !== 'crop' && value === null).map(([key]) => key);
    $('status').textContent = missing.length ? 'Missing inputs (' + missing.join(', ') + '): projections may use original workbook example values.' : '';
    $('irrigation').textContent = num(s.irrigation); $('planting').textContent = safe(s.plantingYear);
    $('balance-irrigation').textContent = num(b.irrigation); $('balance-leaching').textContent = num(b.leaching);
    $('manual-irrigation').textContent = num(b.manualIrrigation); $('manual-shortage').textContent = num(b.manualShortage);
    $('equilibrium').textContent = 'Long-term equilibrium: ' + num(s.equilibrium) + ' dS/m';
    $('threshold').textContent = 'Selected crop threshold: ' + num(s.threshold) + ' dS/m';
    graph(s.years, typeof data.values.ece === 'number' ? data.values.ece : 9, s.threshold);
    renderMeasures(d);
    if (!groupsRendered) { buildGroups(data.groups); setupSheets(data.worksheets, data.files); }
    lastUpdated = new Date();
    $('control-state').textContent = Object.keys(advanced).length ? 'Applied at ' + lastUpdated.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Using workbook defaults';
    $('recalculate').classList.remove('attention');
  } catch (error) { if (sequence === calculationSequence) $('status').textContent = 'Could not calculate: ' + error.message; }
}
form.addEventListener('submit', event => { event.preventDefault(); update(); });
form.addEventListener('change', () => { $('status').textContent = 'Inputs changed. Update the dashboard to recalculate.'; });
$('crop').add(new Option('Barley','Barley'));
update();
