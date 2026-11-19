const S = {role: 'pm', kept: false, gap: null, dispute: {}, version: 1, running: false, stage: 0, timer: null, simEdit: false, sandbox: false, approved: false, pending: false, undoTimer: null,
  rung: 3, showNew: false, filter: 'look', modal: null, reviewed: {}, d4: null, kf: -1, cmdSel: 0, last: null, lastPanel: null, pop: false, renderedAt: 0, open: {price: true}};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const sum = a => a.reduce((x, y) => x + y, 0);
// The product is built in four phases. Each is the same screens with more switched on.
// The four rungs of the build. Each one simulates situations further from what has been seen.
const RUNGS = [
  {id: '1', name: 'Simulations of real conversations', not: 'any written simulation.'},
  {id: '2', name: 'Simulations of variations', not: 'situations no customer has raised.'},
  {id: '3', name: 'Simulations of situations not yet seen', not: 'review that varies by area.'},
  {id: 'north', label: 'North star', name: 'The record sets the review', on: 'Low-risk fixes start on their own where the sims have been right.'},
];
try { const i = RUNGS.findIndex(r => r.id === sessionStorage.getItem('rung')); if (i >= 0) S.rung = i; S.showNew = sessionStorage.getItem('new') === '1'; } catch (e) { /* storage is blocked */ }
function store() { try { sessionStorage.setItem('rung', RUNGS[S.rung].id); sessionStorage.setItem('new', S.showNew ? '1' : ''); } catch (e) { /* storage is blocked */ } }
// Each rung starts from the same untouched fix.
function setRung(id) {
  const i = RUNGS.findIndex(r => r.id === id); if (i < 0) return;
  if (i !== S.rung) { clearInterval(S.timer); clearTimeout(S.undoTimer);
    Object.assign(S, {rung: i, kept: false, gap: null, dispute: {}, version: 1, running: false, stage: 0, timer: null, simEdit: false, sandbox: false, approved: false, pending: false, filter: 'look', kf: -1, open: {price: true}}); }
  store();
}
const vars = () => S.rung >= 1;     // written sims: variations on real conversations, and the set they are kept in
const unseen = () => S.rung >= 2;   // sims with no conversation behind them, coverage, and the set that must always work
const north = () => S.rung >= 3;    // the record by area sets the review, and low-risk fixes start on their own
const earned = north, auto = north;
// In "show what is new" mode, marks what the current rung adds to the one before it. Rung 1 marks what it shows.
const RUNG = () => RUNGS[S.rung];
const nw = r => S.showNew && S.rung === r ? ' data-new' : '';
const RECENT = 200;
const made = () => 9 + (vars() ? 2 : 0) + (unseen() ? 1 : 0);
const RUN = () => north() ? {runs: '598', time: '4 minutes'} : unseen() ? {runs: '4,294', time: '19 minutes'} : {runs: '4,162', time: '18 minutes'};
const isOpen = id => S.open[id] ?? (S.rung === 0 ? ['replay', 'judge', 'real'].includes(id) : S.rung === 1 && id === 'sims');
const areaRec = name => HEALTH.areas.find(a => a.area === name);
const holds = r => !!r && r.held === r.of && r.of >= 5;
// How much review a fix needs, from its risk and the record of its area.
function review(f) {
  const r = areaRec(f.area), low = f.risk[0] === 'Low';
  const rec = !r ? 'no predictions checked here yet' : r.of < 5 ? 'too few predictions checked here' : `${r.held} of ${r.of} predictions here held`;
  if (low && holds(r)) return {light: true, why: `low risk, and ${rec}`};
  return {light: false, why: f.risk[0] === 'High' ? `it ${f.risk[1].toLowerCase()}` : `${f.risk[0].toLowerCase()} risk, and ${rec}`};
}
const reviewLine = f => { if (!earned()) return ''; const v = review(f);
  return auto() ? (v.light ? `Started on its own: ${v.why}` : `${f.state === 'testing' ? 'Will wait' : 'Waits'} for a person: ${v.why}`) : `${v.light ? 'Short review' : 'Full review'}: ${v.why}`; };
// In phase 4 a low-risk fix in an area with a clean record has already started.
const fixList = () => FIXES.map(f => auto() && !f.live && f.state === 'ready' && review(f).light ? {...f, state: 'auto', detail: 'Started on its own on 10% of shipping conversations. You were told.'} : f);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const made0 = () => SIMS.filter(s => s.source === 'real' || (s.source === 'var' && vars()) || (s.source === 'branch' && unseen()));
const sims = () => [...made0(), GIFT[S.version], ...(unseen() && S.gap && S.version === 2 ? [lateSim(S.gap)] : []), ...(unseen() ? [S.simEdit ? PINNED_EDITED : PINNED] : []), ...(vars() ? [NOISE, INVALID, UNDECIDED] : [])];
const simById = id => sims().find(s => s.id === id);
const runs = str => `<span class="runs" title="${[...str].filter(c => c === 'p').length} of ${str.length} runs passed">${[...str].map(c => `<i class="${c}"></i>`).join('')}</span>`;
const res = r => r === 'pass' ? '<span class="res pass">Pass</span>' : r === 'fail' ? '<span class="res fail">Fail</span>' : r === 'unk' ? '<span class="res unk">Undecided</span>' : '<span class="res na">Not reached</span>';
// One name per result, in plain words.
const STATUS = {
  fixed: ['green', 'Fixed'], worse: ['red', 'Got worse'], intended: ['amber', 'Expects the old behavior'], noise: ['', 'Unstable test'],
  scope: ['', 'Unchanged on purpose'], updated: ['green', 'Updated by you'], inconclusive: ['', 'Could not be used'],
};
const statusOf = s => s.source === 'branch' && s.status === 'worse' ? ['amber', 'A failure is possible'] : s.status === 'updated' && !isPm() ? ['green', 'Updated by Sam Okafor'] : s.id === 'X-04' ? ['', 'Faulty test'] : s.id === 'R-22' ? ['', 'Policy unclear'] : STATUS[s.status];
const sourceLabel = s => s.source === 'real' ? `Real conversation #${s.conv}` : s.source === 'var' ? `Variation on real conversation #${s.from}: ${s.detail}` : s.source === 'branch' ? `Written from ${s.branch}, with no conversation behind it` : 'Written by a person';
const isUnread = s => s.source === 'var' && !s.reviewed && !S.reviewed[s.id];
const unreviewed = () => made0().filter(isUnread);
const questionsLeft = () => !unseen() || S.simEdit || S.kept ? 0 : 1;
const canApprove = () => S.version === 2 && !S.running && !S.approved && !questionsLeft() && !S.kept && S.gap !== 'handoff';
// Two people can review a fix. They see the same evidence. What each may decide differs.
const PEOPLE = {pm: {name: 'Sam Okafor', title: 'Agent PM'}, cust: {name: 'Maria Chen', title: 'Support lead at Ridgeline'}};
const me = () => PEOPLE[S.role];
const other = () => PEOPLE[S.role === 'pm' ? 'cust' : 'pm'];
const isPm = () => S.role === 'pm';
// Only the Agent PM decides the escalation sim, so the customer view names him.
const You = () => isPm() ? 'You' : 'Sam Okafor';
const you = () => isPm() ? 'you' : 'Sam Okafor';
// Who owns what a checkpoint expects. Only the owner can change it.
const cpOwner = c => /Rule: Payments/.test(c.src) ? 'Luis Ferrer, Finance' : /Rule: Account privacy/.test(c.src) ? 'Dana Reyes, Compliance' : 'Sam Okafor, Agent PM';
const ownsCp = c => cpOwner(c).startsWith(me().name);
const cpSource = c => c.src.replace(/^The issue/, 'the issue').replace(/[,.] .*$/, '');
function disputeEffect(s, cid) {
  const c = CP[cid], row = s.checks.find(x => x[0] === cid), failing = row && row[2] === 'fail';
  return {
    to: ownsCp(c) ? `You. You own ${cpSource(c)}, so the question is added to your own list.` : `${cpOwner(c)}, who owns ${cpSource(c)}. ${other().name} and Autopilot are told too.`,
    fix: failing ? 'Nothing changes yet. The result still counts as a failure, so approval stays off.' : 'Nothing changes yet. The result still counts as it did.',
    then: 'If the owner agrees, the sim is changed and runs again on both versions. If not, the sim stays and your note is kept with it.',
  };
}
const FOUND = sum(UNCHANGED.filter(u => u.layer === 'foundational').map(u => u.n));
const N = {
  near: sum(UNCHANGED.filter(u => u.layer === 'near').map(u => u.n)) + 3,
  sample0: sum(UNCHANGED.filter(u => u.layer === 'sample').map(u => u.n)),
  evolving: sum(TS.intents.map(i => i.sims)),
  refundConv: sum(COVERAGE.map(c => c.conv)),
};
// The set that must always work joins at rung 3. Until North star every sim runs on every fix; then the rest of the agent is sampled.
Object.defineProperties(N, {
  found: {get: () => unseen() ? FOUND + 1 : 0},
  sample: {get: () => earned() ? N.sample0 : N.evolving - 6 - N.near},
  unchanged: {get: () => sum(UNCHANGED.filter(u => u.layer === 'near').map(u => u.n)) + (unseen() ? FOUND : 0) + N.sample},
  existing: {get: () => N.found + N.near + N.sample},
  all: {get: () => N.existing + made()},
});
const unchangedRows = () => UNCHANGED.map(u => u.layer === 'sample' && !earned() ? {...u, n: N.sample, why: 'Every sim runs on every fix'} : u);

function simGroups() {
  const all = sims();
  return {look: all.filter(s => ['worse', 'intended', 'updated', 'scope'].includes(s.status)), fixed: all.filter(s => s.status === 'fixed'), skip: all.filter(s => ['noise', 'inconclusive'].includes(s.status))};
}
const simOrder = () => { const g = simGroups(); return [...g.look, ...g.fixed, ...g.skip]; };

function parse() {
  const r = (location.hash || '#/overview').slice(2);
  if (r.startsWith('sim/')) return {base: 'fix', panel: 'sim', id: r.slice(4)};
  if (r.startsWith('fix/')) { const p = r.split('/')[2]; return {base: 'fix', panel: p === 'change' || p === 'tested' ? p : null}; }
  if (r.startsWith('sets')) { const t = r.split('/')[1]; return {base: 'sets', tab: t === 'coverage' || t === 'foundational' ? t : 'week'}; }
  if (r.startsWith('health')) return {base: 'health'};
  if (r.startsWith('fixes')) return {base: 'fixes'};
  if (r.startsWith('area/')) return {base: 'area', id: r.slice(5)};
  return {base: 'overview'};
}

function toast(msg, undo, ms) {
  const keep = !undo && S.pending;
  $$('.toast').forEach(t => { if (!keep || !t.dataset.keep) t.remove(); });
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  if (undo) { const b = document.createElement('button'); b.dataset.act = undo; b.innerHTML = 'Undo <kbd>Z</kbd>'; t.appendChild(b); t.dataset.keep = '1';
    const c = document.createElement('i'); c.className = 'drain'; c.style.animationDuration = (ms || 3200) + 'ms'; t.appendChild(c); }
  else if (keep && $('.toast')) t.classList.add('up');
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms || 3200);
}

const ICON = {
  overview: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.2" y="2.2" width="4.6" height="4.6" rx="1"/><rect x="9.2" y="2.2" width="4.6" height="4.6" rx="1"/><rect x="2.2" y="9.2" width="4.6" height="4.6" rx="1"/><rect x="9.2" y="9.2" width="4.6" height="4.6" rx="1"/></svg>',
  fixes: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 9.5h3.2l1 1.8h3.6l1-1.8H14M2 9.5l1.7-5.6h8.6L14 9.5v3.1H2z" stroke-linejoin="round"/></svg>',
  sets: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 2l6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3" stroke-linejoin="round"/></svg>',
  health: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.8"/><circle cx="8" cy="8" r="2.2"/></svg>',
  search: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"/></svg>',
};
// A status mark: ok, no, open (needs a person), live, or empty.
const GLYPH = {ok: '<path d="M2 5.3l2 2 4-4.5"/>', no: '<path d="M2.7 2.7l4.6 4.6M7.3 2.7L2.7 7.3"/>', open: '<path d="M5 2.4v3.2M5 7.6v.1"/>', live: '<path d="M2 5.3l2 2 4-4.5"/>'};
const mk = (kind, sm) => `<span class="mark ${kind || ''} ${sm ? 'sm' : ''}">${GLYPH[kind] ? `<svg viewBox="0 0 10 10">${GLYPH[kind]}</svg>` : ''}</span>`;

// ---------- Shell ----------
function waiting() {
  const mine = S.approved || S.running || S.kept ? 0 : 1;
  return fixList().filter(f => !f.live && f.state !== 'testing' && f.state !== 'auto').length + mine;
}
function shell(p, body, enter) {
  const on = b => p.base === b ? 'on' : '';
  return `<div class="app">
    <aside class="side">
      <div class="brand"><span class="brand-mark"><i></i></span>Autopilot<small>Ridgeline</small></div>
      <button class="search" data-act="cmd">${ICON.search}<span>Search or jump to</span><kbd>&#8984;K</kbd></button>
      <nav class="nav">
        ${unseen() ? `<a href="#/overview" class="${on('overview') || on('area')}"${nw(2)}>${ICON.overview}Overview</a>` : ''}
        <a href="#/fixes" class="${on('fixes') || on('fix')}">${ICON.fixes}Fixes <span class="count">${tw('waiting', waiting())}</span></a>
        ${vars() ? `<a href="#/sets" class="${on('sets')}"${nw(1)}>${ICON.sets}Test sets</a>` : ''}
        <a href="#/health" class="${on('health')}"${nw(0)}>${ICON.health}Sim accuracy</a>
      </nav>
      <div class="phase"><span class="label">Prototype rung</span>
        <div class="phase-seg" role="group" aria-label="Prototype rung">${RUNGS.map((r, i) => `<button data-act="phase" data-v="${r.id}" class="${S.rung === i ? 'on' : ''}" aria-pressed="${S.rung === i}" title="${r.label || r.id}: ${r.name}">${r.label || r.id}</button>`).join('')}</div>
        <p id="phase-label"><b>${RUNG().label || RUNG().id + '. ' + RUNG().name}.</b> ${RUNG().not ? 'Not yet: ' + RUNG().not : RUNG().on}</p>
        <label class="phase-new"><input type="checkbox" data-act="showNew" ${S.showNew ? 'checked' : ''}>Show what is new in this rung</label></div>
      <div class="side-foot">${me().name}, ${me().title}<br><a class="link" href="#/as/${isPm() ? 'customer' : 'pm'}">View as the ${isPm() ? 'customer reviewer' : 'Agent PM'}</a> · <a class="link" href="#" data-act="who">Who decides what</a><br>Sample data. Ridgeline Outdoor is fictional.<br><a class="link" href="#" data-act="keys">Keyboard shortcuts</a></div>
    </aside>
    <main class="main"><div class="page ${enter ? 'enter' : ''}">${body}</div></main>
  </div>${panel(p)}${modal()}`;
}

// ---------- Overview and areas ----------
// One map of what the agent does. Coverage, fixes and the sims' record are all read against it.
const slug = n => n.toLowerCase().replace(/[^a-z]+/g, '-');
const joined = k => drafts().filter(d => d.id[0] === k && draftState(d)[1] === 'Joined').length;
function areas() {
  const refunds = Math.round(100 * sum(COVERAGE.filter(c => c.before > 0 || (S.approved && c.added > 0) || (c.gap && joined('I') > 0)).map(c => c.conv)) / N.refundConv);
  return TS.intents.map(i => ({...i, slug: slug(i.name), rec: areaRec(i.name),
    covered: i.flag === 'fading' ? null : i.flag === 'under' ? refunds : i.flag === 'new' ? sum(drafts().filter(d => d.id[0] === 'D' && draftState(d)[1] === 'Joined').map(d => d.of)) : i.covered,
    sims: i.flag === 'fading' ? 0 : i.sims + (i.flag === 'new' ? joined('D') : 0) + (i.flag === 'under' ? joined('I') + (S.approved ? made() : 0) : 0),
    fixes: fixItems().filter(f => f.area === i.name)}));
}
function fixItems() {
  const mine = fix214();
  return fixList().map(f => f.live ? {...f, state: mine[0], detail: mine[1] || (S.pending ? 'Approved by you just now. Starting on 10% of refund conversations.' : 'Live on 10% of refund conversations.')} : f);
}
const coverageNow = as => { const a = as.filter(x => x.covered !== null); return Math.round(sum(a.map(x => x.share * x.covered)) / sum(a.map(x => x.share))); };
const bar = (pct, cls, key) => `<span class="bar ${cls || ''}" ${key ? `data-twb="${key}" data-v="${pct}"` : ''}><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
// A number that counts from its last value to the new one when an action changes it. The final value is always in the markup.
const tw = (key, v, suf) => `<span data-tw="${key}" data-v="${v}" data-suf="${suf || ''}">${v}${suf || ''}</span>`;
const PREV = {};
const still = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = ms => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* no haptics on this device */ } };
function settle() {
  const calm = still();
  $$('[data-tw]').forEach(el => { const k = 'n:' + el.dataset.tw, v = +el.dataset.v, o = PREV[k]; PREV[k] = v;
    if (o === undefined || o === v) return;
    el.classList.add('changed'); if (calm) return;
    const suf = el.dataset.suf, t0 = performance.now();
    const step = t => { const f = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - f, 3); el.textContent = Math.round(o + (v - o) * e) + suf; if (f < 1 && el.isConnected) requestAnimationFrame(step); };
    el.textContent = o + suf; requestAnimationFrame(step); });
  $$('[data-twb]').forEach(el => { const k = 'b:' + el.dataset.twb, v = +el.dataset.v, o = PREV[k]; PREV[k] = v;
    if (o === undefined || o === v || calm) return;
    const i = el.firstElementChild; i.style.animation = 'none'; i.style.transition = 'none'; i.style.width = o + '%'; void i.offsetWidth; i.style.transition = ''; i.style.width = v + '%'; });
  // On a phone a table becomes a list, so each value carries its column's name.
  $$('.tablecard > table.tbl:not(.acc-t)').forEach(t => { const hs = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim()); if (!hs.length) return;
    t.classList.add('stk'); t.querySelectorAll('tbody tr').forEach(r => [...r.children].forEach((td, i) => { if (!i || !hs[i] || r.children.length !== hs.length) return;
      if (!td.textContent.trim() && !td.children.length) return td.classList.add('nil');
      td.dataset.l = hs[i]; const v = document.createElement('div'); v.className = 'v'; v.append(...td.childNodes); td.append(v); })); });
  if (S.fresh) { const b = $(`[data-id="${S.fresh}"]`), t = b && (b.classList.contains('draft') ? b.querySelector('.draft-why') : b.nextElementSibling); if (t) t.classList.add('fresh'); S.fresh = null; }
}
// A prediction, in words that can be compared: what the sims said, what real conversations did, and the verdict.
const predGap = p => p.actual === null ? null : p.actual - p.predicted;
const gapWords = p => { const g = predGap(p); return g === null ? '' : g === 0 ? 'as predicted' : `${Math.abs(g)} ${Math.abs(g) === 1 ? 'point' : 'points'} ${g > 0 ? 'higher' : 'lower'} than predicted`; };
const predSaid = p => p.said ? esc(p.said) : `Handoffs fall from ${p.before}% to ${p.predicted}%`;
const predReal = p => p.happened ? esc(p.happened) : p.actual === null ? esc(p.noActual) : `Fell to ${p.actual}%, ${gapWords(p)}`;
const predRes = p => `<span class="res ${p.ok ? 'pass' : p.kind === 'False alarm' ? 'unk' : 'fail'}">${p.ok ? 'Held' : p.kind}</span>`;
const predWhy = p => p.why ? `<div class="d"><b>Why.</b> ${esc(p.why)} <b>Since then.</b> ${esc(p.since)}</div>` : '';
const scale = (before, predicted, actual) => `<span class="scale" role="img" aria-label="Before ${before}%, predicted ${predicted}%${actual === null ? '' : `, real ${actual}%`}">${actual === null ? '' : `<i class="fall" style="left:${actual}%;width:${before - actual}%"></i>`}<i class="b" style="left:${before}%"></i>${actual === null ? '' : `<i class="a" style="left:${actual}%"></i>`}<i class="p" style="left:${predicted}%"></i></span>`;
const dots = (held, of) => `<span class="dots">${'<i></i>'.repeat(held)}${'<i class="no"></i>'.repeat(of - held)}</span>`;
const STATE_WORD = {needs: 'needs you', ready: 'ready', testing: 'testing', live: 'approved', auto: 'started on its own'};
function fixRows(list, showArea) {
  return list.map(f => {
    const lead = f.state === 'needs' ? mk('open') : f.state === 'ready' ? mk('ok') : f.state === 'closed' ? mk('no') : f.state === 'live' || f.state === 'auto' ? mk('live') : '<span class="spinner"></span>';
    const inner = `${lead}<span><b>${esc(f.title)}</b><span class="ask-line">${f.state === 'ready' ? 'Ready for you to approve. ' : ''}${esc(f.detail)}</span></span>
      <span class="side-meta">Fix ${f.id}${showArea ? `<br>${esc(f.area)}` : `<br>${f.conv} conversations a month`}</span>`;
    return `<div class="row">${f.live ? `<a class="q-row click" href="#/fix/214">${inner}</a>` : `<button class="q-row click" data-stub="${f.id}">${inner}</button>`}</div>`;
  }).join('');
}
function overview() {
  const as = areas(), cov = coverageNow(as);
  const todo = fixItems().filter(f => f.state === 'needs' || f.state === 'ready');
  const d4 = S.d4 ? '' : `<div class="row"><a class="q-row click" href="#/sets">${mk('open')}<span><b>Does an item bought with a discount code qualify for a price match?</b><span class="ask-line">A new sim for price match requests cannot be used until you answer.</span></span><span class="side-meta">New sim<br>Price match requests</span></a></div>`;
  const count = todo.length + (S.d4 ? 0 : 1);
  const thin = as.filter(a => a.covered !== null && a.covered < 95).sort((a, b) => a.covered - b.covered).slice(0, 3).map(a => `${a.name} (${a.covered}%)`).join(', ');
  const fixChip = a => a.fixes.length ? a.fixes.map(f => `<span class="chip ${f.state === 'needs' ? 'amber' : f.state === 'ready' ? 'green' : f.state === 'live' || f.state === 'auto' ? 'blue' : ''}">Fix ${f.id} ${STATE_WORD[f.state]}</span>`).join(' ') : '';
  const note = a => a.flag === 'new' ? 'New this month' : a.flag === 'under' ? (S.approved ? `Was thinly tested. Fix 214 added ${made()} sims.` : 'Thinly tested, with recurring failures') : a.flag === 'fading' ? 'Customers stopped asking. Its 6 sims were retired this week.' : '';
  const rows = as.map(a => `<tr class="click" tabindex="0" data-go="#/area/${a.slug}"><td class="area"><b>${esc(a.name)}</b>${note(a) ? `<div class="d">${note(a)}</div>` : ''}</td>
    <td class="nowrap num">${bar(a.share / 27 * 100, 'vol')}${a.share}%</td>
    <td class="nowrap num">${a.covered === null ? '<span class="muted">Retired</span>' : bar(a.covered, a.covered < 95 ? 'thin' : 'okb') + a.covered + '%'}</td>
    <td class="num">${a.sims}</td>
    <td class="nowrap num">${a.rec ? dots(a.rec.held, a.rec.of) + `${a.rec.held} of ${a.rec.of}` : '<span class="muted">None checked yet</span>'}</td>
    <td>${fixChip(a)}</td></tr>`).join('');
  // What fix 214 does to each rule group, in the same words as the fix page.
  const mustNow = g => {
    const pay = g.group === 'Payments', esc2 = g.group === 'Escalation to a person';
    if ((pay || esc2) && S.running) return ['na', 'Fix 214 is being tested again', '#/fix/214'];
    if (pay && S.version === 1) return ['fail', 'Fix 214 breaks 1', '#/sim/S-12'];
    if (esc2 && S.simEdit) return ['pass', 'All pass. 1 was updated by you.', '#/sim/P-03'];
    if (esc2) return ['unk', S.version === 1 ? 'Fix 214 changes 1. You decide once the fix works.' : 'Fix 214 changes 1, and needs your answer', '#/sim/P-03'];
    return ['pass', 'All pass', '#/sets/foundational'];
  };
  const must = TS.foundational.map(g => {
    const [cls, word, to] = mustNow(g), st = `<span class="res ${cls}">${word}</span>`;
    return `<tr class="click" tabindex="0" data-go="${to}"><td><b>${esc(g.group)}</b><div class="d">For example: ${esc(g.example)}</div></td><td class="num">${g.n}</td><td class="muted">${esc(g.owner)}</td><td>${st}</td></tr>`; }).join('');
  return `<div class="head"><div><h1>Overview</h1>
    <div class="sub">A sim is a test conversation. Autopilot runs sims on every fix before it reaches customers. This page shows whether the sims cover what customers ask, and whether they have been right.</div>
    <div class="meta">Test sets version ${TS.version}, refreshed 10 Nov from ${TS.conversations.toLocaleString()} conversations</div></div></div>
  <div class="q-group">Needs you<span>${[todo.length ? `${todo.length} ${todo.length === 1 ? 'fix' : 'fixes'}` : '', S.d4 ? '' : '1 sim question'].filter(Boolean).join(' and ') || '0'}</span></div>
  ${count ? `<div class="card rows">${fixRows(todo, true)}${d4}</div>` : `<div class="card needs">${mk('ok')}<div><h2>Nothing is waiting for you</h2><p>Fixes and sim questions appear here once Autopilot has tested them.</p></div></div>`}
  <div class="section grid2">
    <a class="card anchor" href="#/sets/coverage"${nw(2)}><span class="label">Coverage</span><div class="fig0">${tw('cov', cov, '%')}</div><p>of conversations are a situation that a sim tests.</p>${bar(cov, 'wide okb', 'cov')}
      <div class="foot">Thinnest: ${thin}.</div></a>
    <a class="card anchor" href="#/health"><span class="label">Trust</span><div class="fig0">17 of 20</div><p>fixes did in real conversations what the sims predicted.</p><div class="dotrow">${dots(17, 20)}</div>
      <div class="foot">The 3 that did not: 1 said a fix was safe when it was not, 1 promised more than it delivered, and 1 was a false alarm.</div></a>
  </div>
  <div class="section"${nw(2)}><div class="section-head"><h2>What the agent handles</h2><p>Open a row to see its sims, gaps, record and fixes.</p></div>
    <div class="card tablecard"><table class="tbl tight map"><thead><tr><th>Area</th><th>Conversations</th><th>Tested</th><th>Sims</th><th>Sims were right</th><th>Fixes</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="section"${nw(2)}><div class="section-head"><h2>What must always work</h2><p>${N.found} sims, built from guardrails, policies and past incidents. They run on every fix.</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Rule</th><th>Sims</th><th>Owner</th><th>Now</th></tr></thead><tbody>${must}</tbody></table></div></div>`;
}
function areaPage(id) {
  const a = areas().find(x => x.slug === id);
  if (!a) return `<div class="head"><div><h1>There is no area called "${esc(id)}"</h1><div class="sub">The link may be out of date. Every area the agent handles is listed on the <a class="link" href="#/overview">Overview</a>.</div></div></div>`;
  const conv = Math.round(a.share / 100 * TS.conversations / 100) * 100, r = a.rec;
  const scope = !r ? 'No fix in this area has been checked against real conversations yet.' : !earned() ? 'Every fix here gets full review.' : holds(r) ? (auto() ? 'Low-risk fixes here start at 10% on their own.' : 'Low-risk fixes here get a short review. Proposal: they could start at 10% without waiting.') : r.of < 5 ? 'Too few to say. Every fix here waits for a person.' : 'Every fix here waits for a person.';
  const open = a.fixes.filter(f => f.state !== 'live' && f.state !== 'auto').length;
  const facts = `<div class="grid3">
    <div class="card anchor"><span class="label">Tested</span><div class="fig0">${a.covered === null ? 'Retired' : tw('a:' + a.slug, a.covered, '%')}</div><p>${a.covered === null ? 'Customers stopped asking. Its sims are kept, and come back if customers do.' : 'of these conversations are a situation that a sim tests.'}</p>${a.covered === null ? '' : bar(a.covered, 'wide ' + (a.covered < 95 ? 'thin' : 'okb'), 'a:' + a.slug)}</div>
    <div class="card anchor"><span class="label">Sims were right</span><div class="fig0">${r ? `${r.held} of ${r.of}` : 'No record'}</div><p>${r ? 'fixes here did in real conversations what the sims predicted.' : 'No fix here has been checked against real conversations yet.'}</p>${r ? `<div class="dotrow">${dots(r.held, r.of)}</div>` : ''}<div class="foot">${scope}</div></div>
    <div class="card anchor"><span class="label">Fixes</span><div class="fig0">${open}</div><p>${open === 1 ? 'fix is' : 'fixes are'} open in this area.</p></div></div>`;
  let sit = '';
  if (a.flag === 'under') {
    const max = Math.max(...COVERAGE.map(c => c.conv)), intl = joined('I');
    sit = `<div class="section"><div class="section-head"><h2>Situations customers bring</h2><p>From real conversations in the last 30 days.</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Situation</th><th>Conversations</th><th>Sims</th><th></th></tr></thead><tbody>${COVERAGE.map(c => {
      const n = c.before + (S.approved ? c.added : 0) + (c.gap ? intl : 0) + (c.nosim && S.gap ? 1 : 0);
      const why = c.nosim ? (S.gap ? 'S-13, built from your answer on <a class="link" href="#/fix/214">fix 214</a>.' : 'Fix 214 changes this, and past conversations do not give one expected outcome. <a class="link" href="#/fix/214">Answer on fix 214</a>') : c.touched ? (S.approved ? `${c.added} added with fix 214` : `${c.added} written for <a class="link" href="#/fix/214">fix 214</a>. They are kept if it is approved.`) : c.gap ? `${intl} new this week, built from real conversations. <a class="link" href="#/sets">See them</a>` : '';
      return `<tr><td>${esc(c.branch)}</td><td class="nowrap num">${bar(c.conv / max * 100, 'vol')}${c.conv.toLocaleString()}</td><td class="num">${n ? n : '<span class="res unk">None</span>'}</td><td class="small t2">${why}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  } else if (a.flag === 'new') {
    const rest = 100 - sum(TS.drafts.map(d => d.of));
    sit = `<div class="section"><div class="section-head"><h2>Situations customers bring</h2><p>Each has one new sim, built from a real conversation. <a class="link" href="#/sets">Review them in Test sets</a></p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Situation</th><th>Share of these conversations</th><th>Expected outcome</th><th>Its sim</th></tr></thead><tbody>${drafts().filter(d => d.id[0] === 'D').map(d => `<tr><td><b>${d.id}</b> ${esc(d.title)}</td><td class="nowrap num">${bar(d.of / 35 * 100, 'vol')}${d.of}%</td><td class="t2">${d.outcome ? esc(d.outcome) : d.ask && S.d4 ? 'Set by your answer' : 'Waiting for your answer'}</td><td class="nowrap">${esc(draftWord(d))}</td></tr>`).join('')}<tr><td class="t2">Other price match conversations</td><td class="nowrap num">${bar(rest / 35 * 100, 'vol')}${rest}%</td><td></td><td class="nowrap"><span class="res unk">None</span></td></tr></tbody></table></div></div>`;
  } else sit = `<div class="section"><p class="note">In this prototype, the situations inside an area are listed for <a class="link" href="#/area/refunds-and-returns">Refunds and returns</a> and <a class="link" href="#/area/price-match-requests">Price match requests</a>.</p></div>`;
  const preds = HEALTH.predictions.filter(p => p.area === a.name);
  const pend = a.flag === 'under' && S.approved ? `<tr><td><b>Refunds on multi-parcel orders</b><div class="d">Fix 214</div></td><td>Handoffs fall from 94% to about 15%</td><td class="muted">Checked on 17 Nov</td><td class="nowrap"><span class="res na">Not checked yet</span></td></tr>` : '';
  const rec = preds.length || pend ? `<div class="section"><div class="section-head"><h2>Were the sims right here?</h2><p>${r && preds.length < r.of ? `The ${preds.length === 1 ? 'most recent' : preds.length + ' most recent'} of ${r.of}. ` : ''}<a class="link" href="#/health">All predictions</a></p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th style="width:24%">Fix</th><th style="width:22%">Sims predicted</th><th>Real conversations, after 7 days</th><th>Result</th></tr></thead><tbody>${pend}${preds.map(p => `<tr><td><b>${esc(p.title)}</b><div class="d">Fix ${p.id}</div></td><td>${predSaid(p)}</td><td>${predReal(p)}${predWhy(p)}</td>
    <td class="nowrap">${predRes(p)}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">A prediction held when handoffs fell to within ${HEALTH.within} points of what the sims predicted, and nothing the sims passed broke.</p></div>` : '';
  const fx = a.fixes.length ? `<div class="section"><div class="section-head"><h2>Fixes in this area</h2></div><div class="card rows">${fixRows(a.fixes)}</div></div>` : '';
  return `<div class="crumbs"><a href="#/overview">Overview</a><span>/</span><span>${esc(a.name)}</span></div>
  <div class="head"><div><h1>${esc(a.name)}</h1>
    <div class="sub">${a.share}% of conversations, about ${conv.toLocaleString()} in the last 30 days. ${a.sims} sims.</div></div></div>
  ${facts}${fx}${sit}${rec}`;
}

// ---------- Fixes ----------
function fix214() {
  if (S.approved) return ['live'];
  if (S.kept) return ['closed', `${You()} kept the sim that expects a handoff. This fix cannot pass it, so it is closed.`];
  if (S.running) return ['testing', 'Autopilot revised the fix and is testing it again.'];
  if (S.version === 1) return ['needs', 'Should orders paid partly by gift card keep going to a specialist?'];
  if (!unseen()) return ['ready', 'Resolves the 8 conversations it was meant to.'];
  if (S.simEdit) return ['ready', 'Resolves the 8 conversations it was meant to. Your question is answered.'];
  return ['needs', 'Should a multi-parcel refund still go to a specialist?'];
}
function inbox() {
  const mine = fix214();
  const items = fixList().map(f => f.live ? {...f, state: mine[0], detail: mine[1], proposal: f.proposal + (S.version === 2 ? ' Orders paid partly by gift card still go to a specialist.' : '')} : f);
  const row = f => {
    const lead = f.state === 'needs' ? mk('open') : f.state === 'ready' ? mk('ok') : f.state === 'closed' ? mk('no') : '<span class="spinner"></span>';
    const inner = `${lead}<span><b>${esc(f.title)}</b><span class="prop">Autopilot proposes: ${esc(f.proposal.charAt(0).toLowerCase() + f.proposal.slice(1))}</span><span class="ask-line">${esc(f.detail)}</span></span>
      <span class="side-meta">${f.conv} conversations a month<br>${f.risk[0]} risk: ${esc(f.risk[1].toLowerCase())}${f.state !== 'closed' && reviewLine(f) ? `<br><span class="rev"${nw(3)}>${esc(reviewLine(f))}</span>` : ''}</span>`;
    return f.live ? `<a class="q-row click" href="#/fix/214">${inner}</a>` : `<button class="q-row click" data-stub="${f.id}">${inner}</button>`;
  };
  const group = (state, title) => {
    const g = items.filter(f => f.state === state);
    return g.length ? `<div class="q-group">${title}<span>${g.length}</span></div><div class="card rows">${g.map(f => `<div class="row">${row(f)}</div>`).join('')}</div>` : '';
  };
  // After approval: where it runs, and from phase 2 the prediction that is kept and checked.
  const rel = (to, title, where, pred, real, on) => `<tr class="click" tabindex="0" ${to}><td><b>${title}</b><div class="d">${where}</div></td><td>${pred}</td><td${real === 'Too early to say' ? ' class="muted"' : ''}>${real}</td><td class="nowrap">${on}</td></tr>`;
  const live = `${S.approved ? rel('data-go="#/fix/214"', 'Refunds on multi-parcel orders are handed to a human', S.pending ? 'Approved by you just now. Starting on 10% of refund conversations' : 'Approved by you today, on 10% of refund conversations', 'Handoffs fall from 94% to about 15%', 'Too early to say', '17 Nov') : ''}
    ${rel('data-stub="206"', 'Tracking link missing from dispatch messages', 'Approved 6 Nov, on 25% of order status conversations', 'Handoffs fall from 22% to about 8%', '9% so far', '13 Nov')}
    ${rel('data-stub="204"', 'Loyalty points balance is out of date', 'Approved 4 Nov, on 10% of account conversations', 'Handoffs fall from 31% to about 12%', '14% so far', '11 Nov')}`;
  const own = items.filter(f => f.state === 'auto');
  const ownRows = own.map(f => `<tr class="click" tabindex="0" data-stub="${f.id}"><td><b>${esc(f.title)}</b><div class="d">Started today on 10% of shipping conversations. You were told.</div></td><td>${f.risk[0]} risk: ${esc(f.risk[1].toLowerCase())}. ${areaRec(f.area).held} of ${areaRec(f.area).of} predictions about shipping held.</td><td>Handoffs fall from 19% to about 6%</td><td class="nowrap">17 Nov</td></tr>`).join('');
  const sub = auto() ? 'Autopilot found each issue, drafted a fix and tested it. A low-risk fix starts on its own where the sims have been right. You see the rest: fixes that carry more risk, and policy questions.'
    : earned() ? 'Autopilot found each issue, drafted a fix and tested it. Nothing reaches customers until you approve it. A low-risk fix where the sims have been right gets a short review: read the result and approve.'
    : 'Autopilot found each issue, drafted a fix and tested it. Nothing reaches customers until you approve it.';
  const rule = auto() ? `<div class="section"><div class="proposal"${nw(3)}><span class="chip green">In use</span><div><b>When a fix starts on its own.</b>
      It is low risk, and at least 5 predictions in its area have all held. It starts on 10% of conversations, you are told, and it stops by itself if a rule is broken. One miss returns the area to full review. A fix that moves money or cannot be undone always waits for a person. Autopilot never changes a sim that must always work. <a class="link" href="#/health" data-act="openAreas">See the record by area</a></div></div></div>`
    : earned() ? `<div class="section"><div class="proposal"><span class="chip blue">Proposal</span><div><b>The Canada shipping fix could have started without waiting for you.</b>
      It is low risk, and the sims' last 5 predictions about shipping all held. Under this proposal a fix like that goes straight to 10% of conversations and you are told afterwards. Today every fix waits for approval. <a class="link" href="#/health" data-act="openAreas">See the record by area</a></div></div></div>` : '';
  return `<div class="head"><div><h1>Fixes</h1>
    <div class="sub"${nw(3)}>${sub}</div></div></div>
    ${group('needs', auto() ? 'Waiting for you' : 'Needs your answer')}${group('ready', 'Ready to approve')}${group('testing', 'Still testing')}${group('closed', 'Closed')}
    ${own.length ? `<div class="section"${nw(3)}><div class="section-head"><h2>Started on their own</h2><p>No person approved these. Each prediction is checked against real conversations after 7 days.</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Fix</th><th>Why it did not wait</th><th>Sims predicted</th><th>Checked on</th></tr></thead><tbody>${ownRows}</tbody></table></div></div>` : ''}
    <div class="section"><div class="section-head"><h2>${auto() ? 'Approved by a person' : 'Approved'}</h2><p>Each starts on a share of conversations. Its prediction is checked against real ones after 7 days.</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Fix</th><th${nw(0)}>Sims predicted</th><th>Real conversations</th><th>Checked on</th></tr></thead><tbody>${live}</tbody></table></div></div>
    ${rule}`;
}

// ---------- Fix page ----------
function fixHeader() {
  return `<div class="crumbs"><a href="#/fixes">Fixes</a><span>/</span><span>Fix 214</span></div>
  <div class="head"><div>
    <h1>Refunds on multi-parcel orders are handed to a human</h1>
    <div class="sub"><b>Autopilot proposes:</b> refund the returned item without a handoff, once it has been delivered and received back.${S.version === 2 ? ' Orders paid partly by gift card still go to a specialist.' : ''} <a class="link" href="#/fix/214/change">See the exact change</a></div>
    <div class="sub">212 conversations in the last 30 days. 94% were handed off, and customers rated them 3.1 out of 5.</div>
    <div class="meta">Version ${S.version} of the fix · High risk, because it moves money · Proposed by Autopilot on 10 Nov · In ${unseen() ? '<a class="link" href="#/area/refunds-and-returns">Refunds and returns</a>' : 'Refunds and returns'}</div>
  </div><div class="actions">
    ${isPm() ? '<button class="btn ghost" data-act="share">Share summary</button>' : '<button class="btn ghost" data-act="askPm">Ask Sam Okafor</button>'}
    ${S.approved || S.version === 1 || S.kept || !isPm() ? '' : `<button class="btn ghost" data-act="sendback" ${S.running ? 'disabled' : ''}>Send back</button>`}
  </div></div>${isPm() ? '' : `<div class="rolebar"><b>You are reviewing for Ridgeline.</b> You see the same result, sims and conversations as Sam Okafor, your Agent PM. You answer questions about Ridgeline's policy, and you can approve. Changing the fix is Sam's job. <a class="link" href="#" data-act="who">Who decides what</a></div>`}`;
}

const stages = () => !vars() ? [
  ['Reproducing the failure on the current agent', 9], ['Simulating the 9 conversations on version 2, 3 times each', 27], ['Grading the wording with the AI judge', 27],
  [`Simulating ${RECENT} recent conversations on both versions`, RECENT], ['Checking the invented refund-tool reply against the real tool', 1],
] : [
  ['Reproducing the failure on the current agent', 9], ['Testing version 2 of the fix', made()], ...(unseen() ? [['Everything that must always work', N.found]] : []),
  ['Sims next to the change', N.near], [earned() ? 'A sample of everything else' : 'Everything else', N.sample], ['More runs where results were mixed', 10], ['Checking the invented refund-tool reply against the real tool', 1],
];
const runStep = () => `Step ${Math.min(S.stage + 1, stages().length)} of ${stages().length}`;
const runPct = () => Math.round(100 * S.stage / stages().length);
function stagesHtml() {
  return stages().map(([label, n], i) => `<div class="stage ${i < S.stage ? 'done' : i === S.stage ? 'now' : ''} ${i === S.stage - 1 ? 'just' : ''}">${i < S.stage ? mk('ok', 1) : i === S.stage ? '<span class="spinner"></span>' : mk('', 1)}<span>${label}</span><span>${i < S.stage ? `${n} of ${n}` : i === S.stage ? 'running' : ''}</span></div>`).join('');
}

function claim(id, kind, title, answer, visual, ask, shown, limits) {
  const open = !!S.open[id];
  const list = (h, items, lim) => items.length ? `<div class="ev-g"><h4>${h}</h4><ul class="ev ${lim ? 'lim' : ''}">${items.map(([k, t]) => `<li>${lim ? '<span class="dash"></span>' : mk(k, 1)}<span>${t}</span></li>`).join('')}</ul></div>` : '';
  return `<div class="claim ${open ? 'open' : ''}"><div class="claim-top">${mk(kind)}<div><h3>${title}</h3><p class="why">${answer}</p></div></div>
    <div class="claim-b">${visual}${ask || ''}
    <button class="ev-t" data-act="toggle" data-id="${id}" aria-expanded="${open}">${ICON.chev}<span>${open ? 'Hide the detail' : 'What the sims showed, and what this result does not cover'}</span></button>
    ${open ? `<div class="ev-wrap">${list('What the sims showed', shown)}${list('What this result does not cover', limits, 1)}</div>` : ''}</div></div>`;
}
const answered = (q, a) => `<div class="ask done">${mk('ok', 1)}<span><b>${q}</b> ${a}</span></div>`;

function readiness() {
  const v1 = S.version === 1, n = questionsLeft(), un = unreviewed();
  // Beside the verdict: the prediction (phase 2), the record and the review it sets (phase 3), why a person is still needed (phase 4).
  const record = `<div class="record"${nw(north() ? 3 : 0)}>${earned() ? `<div><span class="label">How often the sims have been right</span><span><b>4 of 5</b> past predictions about refunds held.</span><span>17 of 20 across the whole agent. <a class="link" href="#/health">See Sim accuracy</a></span></div>`
    : `<div><span class="label">What the sims predict</span><span><b>Handoffs fall from 94% to about 15%.</b></span><span>Kept with the release, and checked against real conversations after 7 days. <a class="link" href="#/health">See Sim accuracy</a></span></div>`}
    ${auto() ? `<div id="why-person"><span class="label">Why this waits for a person</span><span><b>It moves money.</b> A fix that moves money or cannot be undone never starts on its own. Refunds also has 1 miss in 5.</span></div>`
    : earned() ? `<div id="review-level"><span class="label">Review this fix needs</span><span><b>Full review.</b> It moves money, and 1 of 5 predictions about refunds missed.</span><span><a class="link" href="#/fix/214/tested">${N.all} sims selected for it</a></span></div>` : ''}</div>`;
  const top = (kind, title, text) => `<div class="top">${kind === 'run' ? '<span class="spinner" style="width:20px;height:20px;margin-top:1px"></span>' : mk(kind)}<div><h2>${title}</h2><p>${text}</p></div>${kind === 'run' ? '' : record}</div>`;
  if (S.running) return `<div class="card ready">${top('run', 'Testing version 2', 'Autopilot changed the fix so that orders paid partly by gift card still go to a specialist. Every sim runs on the current agent and on the changed agent.')}
    <div class="runhead"><span id="runstep" role="status" aria-live="polite">${runStep()}</span><span class="runbar"><i id="runbar" style="width:${runPct()}%"></i></span></div>
    <div class="stages" id="stages">${stagesHtml()}</div><div class="foot"><button class="btn" data-act="skipRun">Show the result</button><span>The run takes a few seconds here. A real one takes under a minute.</span></div></div>`;

  const gapOpen = unseen() && !S.gap;
  const weak = !vars() ? 'every sim is a conversation that has already happened. Nothing tests a situation outside them.'
    : !unseen() ? 'every sim starts from a real conversation. Nothing tests a situation that no customer has raised.'
    : gapOpen ? 'no sim covers a multi-parcel item returned after 30 days. That is 11 of the 212 conversations a month, on a path this fix changes.' : 'international returns were not tested in this run. Their 3 sims were added after it. That is 3% of refund conversations, on a path this fix does not change.';
  const head = S.approved ? top('live', S.pending ? 'Approved. Starting on 10% of refund conversations' : 'Live for 10% of refund conversations', 'The sims predict that handoffs on multi-parcel refunds fall from 94% to about 15%. On 17 Nov that is checked against real conversations and added to <a class="link" href="#/health">Sim accuracy</a>.' + ' The fix stops by itself if a payments rule is broken in a real conversation.')
    : v1 ? top('no', 'Do not approve. The fix sends a refund to the wrong payment method.', 'Omar H. paid $50.00 by gift card and the rest by Visa. With the fix, the whole $84.00 refund goes to Visa. $50.00 should go back to the gift card. Today a specialist handles orders like his and gets it right.')
    : S.kept ? top('no', `Closed. ${You()} kept the sim, and this fix cannot pass it.`, `The sim expects a handoff for every multi-parcel refund. The fix exists to remove that handoff, so no revision can pass it. Autopilot is told that the 12 Mar policy stands, and stops proposing this change. ${isPm() ? other().name + ' is told.' : 'You are told.'} The 212 conversations a month keep going to a specialist.`)
    : S.gap === 'handoff' ? top('no', 'Do not approve. The fix fails the sim built from your answer.', 'You said a multi-parcel item returned after 30 days goes to a specialist. With the fix, the agent declines the refund. Send the fix back, or change your answer. <b>Weakest point:</b> ' + weak)
    : top(n ? 'open' : 'ok', n ? (isPm() ? `Ready once you answer ${plural(n, 'question')}` : 'Ready once Sam Okafor answers 1 question') : 'Ready to approve', `${n ? 'It resolves the 8 conversations it was meant to. One existing sim expects the old behavior, and ' + (isPm() ? 'only you can say which is right.' : 'only Sam Okafor, who owns the escalation rules, can say which is right.') : ('It resolves the 8 conversations it was meant to, and breaks nothing else.')} <b>Weakest point:</b> ${weak}`);

  const qGift = `<div class="ask"><h3>Should orders paid partly by gift card keep going to a specialist?</h3>
      <p>That is what happens today, and it is the safe answer. If yes, Autopilot revises the fix and tests it again.${isPm() ? '' : ' Only the Agent PM sends a fix back, so your answer goes to Sam Okafor.'}</p>
      <div class="row">${isPm() ? '<button class="btn primary" data-act="doSendback">Yes, send it back with that instruction</button><button class="btn" data-act="sendback">No, give a different instruction</button>' : '<button class="btn primary" data-act="askPm">Yes, ask Sam Okafor to send it back</button><button class="btn" data-act="askPm">No, ask Sam Okafor</button>'}</div></div>`;
  // The 9 real conversations that exposed the issue, one mark each, on both versions of the agent.
  const real = [...SIMS.filter(s => s.source === 'real'), GIFT[S.version]];
  const PIP = {off: '<path d="M2.6 5h4.6M5.4 3.1L7.3 5 5.4 6.9"/>', ok: GLYPH.ok, bad: GLYPH.no};
  const pip = (s, k, word) => `<a class="pip ${k}" href="#/sim/${s.id}" title="${esc(s.scenario.customer)}: ${word}" aria-label="${esc(s.scenario.customer)}: ${word}. Open this conversation."><svg viewBox="0 0 10 10">${PIP[k]}</svg></a>`;
  const last = s => s.id === 'S-12';
  const cmp = `<div class="cmp"${nw(0)}>
    <div class="cmp-r"><span class="cmp-l">Current agent</span><span class="pips">${real.map(s => pip(s, 'off', 'handed to a human')).join('')}</span><span class="cmp-n"><b>0 of 9</b> resolved. All 9 are handed to a human.</span></div>
    <div class="cmp-r"><span class="cmp-l">With the fix</span><span class="pips">${real.map(s => last(s) ? pip(s, v1 ? 'bad' : 'off', v1 ? 'refunded to the wrong payment method' : 'handed to a specialist, as you asked') : pip(s, 'ok', 'resolved')).join('')}</span><span class="cmp-n"><b>8 of 9</b> resolved${v1 ? ' correctly' : ''}. ${v1 ? '1 is refunded to the wrong payment method.' : 'The 9th goes to a specialist, as you asked.'} <a class="link" href="#/sim/S-12">See it</a></span></div>
    <p class="cmp-k">Each mark is one real conversation that ended in a handoff, replayed 3 times on each version. Select a mark to read it.</p></div>`;
  const again = '<a class="link" href="#" data-act="gapUndo">Change your answer</a>';
  const qGap = v1 ? '' : S.gap === 'decline' ? answered('A multi-parcel item returned after 30 days now has a sim.', `S-13 was built from real conversation #88702, with your answer as what it expects: decline, and explain the window. It ran 3 times on each version. With the fix the agent declines. Pass. <a class="link" href="#/sim/S-13">See it</a> · ${again}`)
    : S.gap === 'handoff' ? `<div class="ask"><h3>The fix fails the sim built from your answer</h3>
      <p>S-13 was built from real conversation #88702, with your answer as what it expects: hand off to a specialist. With the fix the agent declines the refund, in 3 runs of 3. Approval is off until the fix is revised. <a class="link" href="#/sim/S-13">See the sim</a></p>
      <div class="row">${isPm() ? '<button class="btn primary" data-act="sendback">Send back to Autopilot</button>' : '<button class="btn primary" data-act="askPm">Ask Sam Okafor to send it back</button>'}${again}</div></div>`
    : `<div class="ask soft"${nw(2)}><h3><span class="res unk">No sim</span> What should the agent do when a multi-parcel item comes back after 30 days?</h3>
      <p>The fix counts 30 days from each item's delivery. It does not say what happens after that. In the 11 real conversations last month, specialists declined 7 and refunded 4, so the past gives no single answer. A sim needs an expected outcome that does not come from the fix, so none was written.</p>
      <p>Your answer becomes what the sim expects, and it runs now. You can also approve without answering. The situation is then recorded as untested.</p>
      <div class="row"><button class="btn" data-act="gap" data-v="decline">Decline, and explain the window</button><button class="btn" data-act="gap" data-v="handoff">Hand off to a specialist</button><a class="btn ghost" href="#/fix/214/tested">See what is covered</a></div></div>`;
  const beyond = (vars() ? `<p class="cmp-k"${nw(1)}>2 variations on these conversations also pass${un.length ? `, ${un.length} of them not yet read by a person` : ''}. Each names the conversation it came from and the detail that was changed. <a class="link" href="#/sim/S-10">See one</a></p>` : '')
    + (unseen() ? `<p class="cmp-k"${nw(2)}><b>Situations no customer has raised.</b> 1 sim with no conversation behind it passes, and 1 situation has no sim. <a class="link" href="#/sim/S-08">See the sim</a></p>` : '');
  const how = [
    '<b>Each sim is a real conversation, run to its end.</b> An AI plays the real customer, with their goal and their account. Only the customer\'s later replies are made up. Each runs 3 times on both agents, an AI judge grades the wording, and the final account state is checked. You read each of the 9, and you confirm what each should end in.',
    '<b>Variations are not read one by one.</b> Each is a real conversation with one detail changed, and takes its expected outcome from policy. Results are sorted by severity. You can open any of them, and dispute one that expects the wrong thing.',
    '<b>Some sims have no conversation behind them.</b> They test situations that no customer has raised yet. Their results are shown apart, and a failure there reads "A failure is possible".'][S.rung];
  const howStrip = how ? `<div class="strip how"${nw(S.rung)}><div>${mk('', 1)}<span>${how}</span></div></div>` : '';
  const c1 = claim('c1', v1 || S.gap === 'handoff' ? 'no' : 'ok', 'Does it fix the problem?',
    v1 ? 'Not yet. It resolves 8 of the 9 conversations and gets 1 wrong.' : S.gap === 'handoff' ? 'It resolves the 8 conversations it was meant to. It fails 1 sim built from your answer.' : gapOpen ? 'Yes. It resolves the 8 conversations it was meant to, in every run. 1 situation it changes has no sim.' : 'Yes. It resolves the 8 conversations it was meant to, in every run.',
    cmp + beyond, v1 ? qGift : unseen() ? qGap : '', [
      ['ok', 'On the current agent, all 9 sims end the way the real conversations did. So they test the right thing.'],
      v1 ? ['no', 'The 9th also breaks a payments rule. It is the same problem, so it is counted once, here.'] : ['ok', 'The 9th, paid partly by gift card, is handed to a specialist. That is what you asked for when you sent version 1 back.'],
      ...(v1 ? [] : [['ok', 'The refund tool\'s reply was checked against the tool\'s test environment on 10 Nov. The reply the sims had invented matched on 5 of 5 fields.']]),
      ...(vars() ? [['ok', `${unseen() ? '2 variations, and 1 sim written from the new procedure steps,' : '2 variations on these conversations'} also pass. <a class="link" href="#/sim/S-10">See one</a>`]] : []),
    ], [
      ...(v1 ? [['', 'Every pass relies on a refund-tool reply that the sims invented, because the tool has never been called this way. It is checked against the real tool when version 2 is tested.']] : []),
      ...(un.length ? [['', `${un.length} of the 2 variations ${un.length === 1 ? 'has' : 'have'} not been read by a person.`]] : []),
      ...(gapOpen ? [['', 'No sim covers a multi-parcel item returned after 30 days. That is 11 conversations a month, on a path this fix changes. It is not counted as a pass.']] : []),
      ...(!vars() ? [['', 'Any situation that is not in these 9 conversations. No sim is written yet.']] : !unseen() ? [['', 'Situations that no customer has raised. Every sim here starts from a real conversation.']]
        : [['', 'International returns were not in this run. This fix does not change how they are handled. <a class="link" href="#/fix/214/tested">See what is covered</a>']]),
    ]);
  // Below rung 3 there is no set that must always work, so nothing here needs an answer.
  const c3b = () => vars() ? claim('c3', 'ok', 'Does it break anything else?', `No. ${N.unchanged} existing sims give the same result on both versions.`,
    `<div class="cmp"${nw(1)}><div class="segbar" role="img" aria-label="${N.unchanged} of ${N.existing} existing sims give the same result on both versions"><i class="same" style="flex:${N.unchanged}"></i><i class="skip" style="flex:3"></i></div>
    <div class="seg-k"><span><i class="same"></i><b>${N.unchanged}</b> give the same result on both versions</span><span><i class="skip"></i><b>3</b> could not be used <a class="link" href="#" data-act="showSkipped">See them</a></span></div>
    <p class="cmp-k">${N.existing} sims that existed before this fix, run on both versions: ${N.near} next to the change, and all ${N.sample} from the rest of the agent. Each is a real conversation, or a variation on one.</p></div>`, '',
    [['ok', `${N.unchanged} existing sims give the same result on both versions.`]],
    [['', '3 sims could not be used: 1 gives mixed results on the agent as it is today, 1 is a faulty test, and in 1 the policy is unclear. None is counted as a pass.']])
  : claim('c3', 'ok', 'Does it break anything else?', `No. ${RECENT} recent conversations that it should not touch end the same way on both versions.`,
    `<div class="cmp"${nw(0)}><div class="segbar" role="img" aria-label="All ${RECENT} end the same way on both versions"><i class="same" style="flex:1"></i></div>
    <div class="seg-k"><span><i class="same"></i><b>${RECENT}</b> end the same way on both versions</span></div>
    <p class="cmp-k">${RECENT} recent conversations that the fix should not touch, picked at random from the last 30 days. Each is simulated the same way as the 9: an AI plays the real customer, on both versions.</p></div>`, '',
    [['ok', `All ${RECENT} sims end the same way on both versions.`], ['ok', 'No rule is broken in any of them.']],
    [['', `Only ${RECENT} conversations were simulated. A rare situation could be missed.`]]);
  const done3 = !v1 && S.simEdit;
  const qSim = v1 ? '' : S.kept ? answered('Should a multi-parcel refund still go to a specialist?', `Yes. ${You()} kept the sim on 10 Nov, so the fix is closed.${isPm() ? ' <a class="link" href="#" data-act="unkeep">Change your answer</a>' : ''}`) : S.simEdit ? answered('Should a multi-parcel refund still go to a specialist?', `No. ${You()} updated the sim on 10 Nov. It ran again and passes 3 of 3.`)
    : `<div class="ask"${nw(2)}><h3>Should a multi-parcel refund still go to a specialist?</h3>
      <p>A sim built from the 12 Mar escalation policy says yes. This fix says no, once the returned item is back. Autopilot cannot change a sim that must always pass. Only a person can.</p>
      <div class="diff"><div class="del">Hands off to a specialist when the order has more than one parcel</div><div class="add">Refunds the returned item without handing off, when it was delivered and received back</div></div>
      ${isPm() ? `<p>If you update it, the sim runs again and the change is recorded under your name. If you keep it, the fix cannot pass and is closed. Autopilot and ${other().name} are told either way.</p>` : '<p>Sam Okafor owns the escalation rules, so this is his to decide. Approval stays off until he answers. You are told either way.</p>'}
      <div class="row">${isPm() ? '<button class="btn primary" data-act="acceptEdit">No, update the sim</button><button class="btn" data-act="refuseEdit">Yes, keep it</button>' : '<button class="btn primary" data-act="askPm">Ask Sam Okafor</button>'}<a class="btn ghost" href="#/sim/P-03">See the sim</a></div></div>`;
  const seg = `<div class="cmp"${nw(2)}${nw(3)}><div class="segbar" role="img" aria-label="${N.unchanged} of ${N.existing} existing sims give the same result on both versions"><i class="same" style="flex:${N.unchanged}"></i><i class="${done3 ? 'same' : 'chg'}" style="flex:1"></i><i class="skip" style="flex:3"></i></div>
    <div class="seg-k"><span><i class="same"></i><b>${N.unchanged}</b> give the same result on both versions</span>
      <span><i class="${done3 ? 'same' : 'chg'}"></i><b>1</b> ${done3 ? `was updated by ${you()}, and passes` : S.kept ? `was kept by ${you()}, and fails with the fix` : 'expects the old behavior'} <a class="link" href="#/sim/P-03">See it</a></span>
      <span><i class="skip"></i><b>3</b> could not be used <a class="link" href="#" data-act="showSkipped">See them</a></span></div>
    <p class="cmp-k">${N.existing} sims that existed before this fix, run on both versions: all ${N.found} that must always work, ${N.near} next to the change, and ${earned() ? 'a random' : 'all'} ${N.sample} from the rest of the agent.</p></div>`;
  const c3 = claim('c3', done3 ? 'ok' : S.kept ? 'no' : v1 ? '' : 'open', 'Does it break anything else?',
    done3 ? (isPm() ? 'No. Nothing broke, and 1 sim was updated with your approval.' : 'No. Nothing broke, and 1 sim was updated by Sam Okafor.') : S.kept ? `Yes. It fails 1 sim that must always work, and ${you()} kept that sim.` : v1 ? 'Not settled yet. 1 existing sim expects the old behavior. You decide on it once the fix works.' : 'One thing to settle. 1 existing sim expects the old behavior, and ' + (isPm() ? 'only you can say which is right.' : 'only Sam Okafor, who owns the escalation rules, can say which is right.'),
    seg, qSim, [
      ['ok', `${N.unchanged} existing sims give the same result on both versions, including ${N.found - 1} of the ${N.found} that must always work.`],
      done3 ? ['ok', `The sim that expected the old behavior was updated by ${you()}. It ran again and passes.`] : S.kept ? ['no', 'One sim that must always work expects a handoff for every multi-parcel refund. You kept it. <a class="link" href="#/sim/P-03">See the sim</a>'] : ['open', 'One sim that must always work expects a handoff for every multi-parcel refund. <a class="link" href="#/sim/P-03">See the sim</a>'],
    ], [
      ['', '3 sims could not be used: 1 gives mixed results on the agent as it is today, 1 is a faulty test, and in 1 the policy is unclear. None is counted as a pass.'],
      ...(earned() ? [['', `Only ${N.sample} sims from parts of the agent far from refunds were run. A problem there could be missed.`]] : []),
    ]);
  const dis = Object.entries(S.dispute).map(([id, x]) => [simById(id), x]).filter(([s, x]) => s && s.checks.some(r => r[0] === x.cid));
  const c2 = dis.length ? `<div class="strip">${dis.map(([s, x]) => { const c = CP[x.cid], f = s.checks.find(r => r[0] === x.cid)[2] === 'fail';
    return `<div>${mk('open', 1)}<span><b>You disputed a sim.</b> ${s.id} expects: "${esc(c.text)}". The question is with ${ownsCp(c) ? 'you' : esc(cpOwner(c))}. Until it is answered the result ${f ? 'still counts as a failure' : 'still counts as it did'}. <a class="link" href="#/sim/${s.id}">See it</a></span></div>`; }).join('')}</div>` : '';

  const foot = S.approved ? '' : `<div class="foot">${canApprove() ? '<button class="btn primary" data-act="approve">Approve and start at 10% <kbd>A</kbd></button><span>Starts on 10% of refund conversations. ' + 'Predicted: handoffs on multi-parcel refunds fall from 94% to about 15%. Checked on 17 Nov against real conversations. ' + 'Stops by itself if a payments rule is broken.' + (gapOpen ? ' <b>Recorded with your approval:</b> a multi-parcel item returned after 30 days has no sim.' : '') + '</span>'
    : `<button class="btn primary" disabled>Approve</button><span>${v1 ? 'Approval is off while a payments rule is broken.' : S.kept ? 'Approval is off because the fix fails a sim that must always work.' : S.gap === 'handoff' ? 'Approval is off while S-13 fails.' : isPm() ? `Answer ${plural(n, 'question')} above to approve.` : 'Approval is off until Sam Okafor answers the question above.'}</span>`}</div>`;
  return `<div class="card ready ${S.pop ? 'pop' : ''}" id="ready">${head}${howStrip}${c2}${c1}${unseen() ? c3 : c3b()}${foot}</div>`;
}

function mini(turns) { return `<div class="thread">${turns.map(turnHtml).join('')}</div>`; }
function replay() {
  const bad = S.version === 1, s = bad ? GIFT[1] : SIMS[0];
  const cut = side => side.turns.slice(side.turns.findIndex(t => t.t === 'marker') + 1).filter(t => t.t === 'agent' || t.t === 'cust').slice(0, 2);
  return `<div class="section"><div class="section-head"><h2>${bad ? 'The conversation that blocks this fix' : 'The conversation that started this'}</h2><p>${bad ? 'Shown because it is the one that fails.' : '1 of 9 real conversations replayed.'} <a class="link" href="#/sim/${s.id}">${vars() ? 'See the whole sim' : 'See the whole conversation'}</a></p></div>
  <div class="card replay">
    <div><div class="cap"><span class="label">The current agent</span><span class="tag">Real conversation #${s.conv}</span></div>
      ${mini([s.before.turns[0], ...cut(s.before)])}
      <div class="out"><b>How it ended.</b> ${esc(s.before.end)}</div></div>
    <div><div class="cap"><span class="label">The same conversation, with the fix</span>${runs(s.runsAfter)}</div>
      ${mini([s.after.turns[0], ...cut(s.after)])}
      <div class="out"${nw(0)}><b>How it ended.</b> ${esc(s.after.end)}</div></div>
  </div></div>`;
}

function simRow(s, cur) {
  const st = statusOf(s);
  const from = s.source === 'pinned' ? 'Must always work, written by a person' : sourceLabel(s);
  return `<tr class="click ${cur === s.id ? 'cur' : ''}" tabindex="0" data-go="#/sim/${s.id}">
    <td><b>${esc(s.title)}</b><div class="d">${s.id} · ${from}${isUnread(s) ? ' · not yet read by a person' : ''}${S.dispute[s.id] ? ' · disputed by you' : ''}</div></td>
    <td>${runs(s.runsBefore)}</td><td>${runs(s.runsAfter)}</td>
    <td><span class="chip ${st[0]}">${st[1]}</span></td>
    <td class="small t2">${esc(s.what)}</td></tr>`;
}
function simsTable(cur) {
  const g = simGroups();
  const tabs = [['look', 'Changed', g.look.length], ['fixed', 'Fixed', g.fixed.length], ['same', 'Unchanged', N.unchanged], ['skip', 'Could not be used', g.skip.length]];
  let body;
  if (S.filter === 'same') {
    const grp = (k, title, note) => `<tr class="group"><td colspan="4">${title}<span>${note}</span></td></tr>` + unchangedRows().filter(u => u.layer === k).map(u =>
      `<tr><td>${esc(u.area)}${u.why ? `<div class="d">${esc(u.why)}</div>` : ''}</td><td class="right num">${u.n}</td><td><span class="res pass">All pass</span></td><td><span class="res pass">All pass</span></td></tr>`).join('');
    body = `<thead><tr><th>Part of the agent</th><th class="right">Sims</th><th>Current agent</th><th>With the fix</th></tr></thead><tbody>
      ${unseen() ? grp('foundational', 'Must always work', `All ${N.found} run on every change`) : ''}${grp('near', 'Next to the change', 'Same procedure, or shares a tool with it')}${grp('sample', 'Everything else', earned() ? 'A random sample' : 'All of it')}</tbody>`;
  } else body = '<thead><tr><th>Sim</th><th>Current agent</th><th>With the fix</th><th>Result</th><th>What happened</th></tr></thead><tbody>' + g[S.filter].map(s => simRow(s, cur)).join('') + '</tbody>';
  const key = S.filter === 'skip' ? `<p class="note key">A pass means every run passed. A failure means the sim failed more often with the fix than without it. These 3 are neither. Each result says nothing about the fix, so it is left out of the count and is never shown as a pass. A sim that must always work gets no such allowance: 2 failed runs block the fix.</p>` : '';
  return `<div class="filters" id="sims">${tabs.map(([k, l, n]) => `<button data-filter="${k}" class="${S.filter === k ? 'on' : ''}">${l}<span>${n}</span></button>`).join('')}</div>
    <div class="tablecard"><table class="tbl tight">${body}</table></div>${key}`;
}

function more(p) {
  const g = simGroups();
  const link = (href, title, why) => `<div class="row"><a class="row-h" href="${href}"><span><b>${title}</b><span class="why">${why}</span></span><span></span>${ICON.chev}</a></div>`;
  return `<div class="section"><div class="section-head"><h2>The evidence in full</h2></div><div class="card rows">
    ${!vars() ? '' : `<div class="row ${isOpen('sims') ? 'open' : ''}"${nw(1)}><button class="row-h" data-act="toggle" data-id="sims" aria-expanded="${isOpen('sims')}"><span><b>All ${N.all} sims, sorted by severity</b><span class="why">${g.look.length} changed, ${g.fixed.length} fixed, ${N.unchanged} unchanged, ${g.skip.length} could not be used</span></span><span></span>${ICON.chev}</button>
      ${isOpen('sims') ? `<div class="row-b">${simsTable(p.panel === 'sim' ? p.id : null)}</div>` : ''}</div>`}
    ${link('#/fix/214/change', 'What changes in the agent', `Step 4 of the Refunds procedure${S.version === 2 ? ', revised after you sent it back' : ''}`)}
    ${link('#/fix/214/tested', 'How it was tested', !vars() ? `${9 + RECENT} sims of real conversations, on both versions. Finished in 6 minutes.` : `${N.all} sims and ${RUN().runs} runs, finished in ${RUN().time}. ${earned() ? 'The widest selection of sims, because the change moves money.' : 'Every sim runs on every fix.'}`)}
  </div></div>`;
}

// What Autopilot got back after version 1 failed, and what it did with it.
function revision() {
  if (S.version !== 2) return '';
  return `<div class="section"><div class="section-head"><h2>What went back to Autopilot, and what it changed</h2><p>Revision 1. Version 2 is the result.</p></div>
  <div class="card pad"><dl class="kv rev">
    <dt>What failed</dt><dd>In version 1, Omar H. paid $50.00 by gift card and the rest by Visa, and the whole $84.00 refund went to Visa. A payments rule was broken. <a class="link" href="#/sim/S-12">See how S-12 runs now</a></dd>
    <dt>At fault</dt><dd>The fix, not the sim. On the current agent the sim ends the way the real conversation did.</dd>
    <dt>Your instruction</dt><dd>"Orders paid partly by gift card should keep going to a specialist for now. Do not try to split the refund."</dd>
    <dt>What it changed</dt><dd>It added line 4c to the Refunds procedure: if any part of the order was paid by gift card, hand off to a specialist. <a class="link" href="#/fix/214/change">See the exact change</a></dd>
    ${!unseen() ? '' : `<dt>Could not change</dt><dd>The sim built from the 12 Mar escalation policy, which expects a handoff for every multi-parcel refund. It must always pass, so Autopilot can only ask. ${S.simEdit ? `${You()} updated it on 10 Nov.` : S.kept ? `${You()} kept it on 10 Nov, so the fix is closed.` : 'The question is above.'}</dd>`}
  </dl></div></div>`;
}

function fixPage(p) { return fixHeader() + readiness() + (S.running ? '' : revision() + replay() + more(p)); }

// ---------- Side panel ----------
function turnHtml(t) {
  if (t.t === 'cust') return `<div class="msg cust"${t.real ? '' : nw(0)}><div class="who">Customer <span class="tag">${t.real ? 'real message' : 'AI customer'}</span></div>${esc(t.text)}</div>`;
  if (t.t === 'agent') return `<div class="msg agent"><div class="who">Agent</div>${esc(t.text)}</div>`;
  if (t.t === 'call') return `<div class="call"><span class="mono">${esc(t.name)}(${esc(t.args)})</span><span class="tag ${t.tag === 'Invented' ? (S.sandbox ? 'ok' : 'inv') : ''}">${t.tag === 'Invented' ? (S.sandbox ? 'Invented, confirmed' : 'Invented reply') : 'Recorded reply'}</span></div>`;
  if (t.t === 'marker') return `<div class="marker"${t.kind === 'sim' ? nw(0) : ''}>${esc(t.text)}</div>`;
  if (t.t === 'flag') return `<div class="cp unk">${esc(t.text)}</div>`;
  if (t.t === 'cp') return `<div class="cp ${t.res}" data-cp="${t.id}">${mk(t.res === 'pass' ? 'ok' : t.res === 'fail' ? 'no' : 'open', 1)}<span>${esc(CP[t.id].text)}</span></div>`;
  return '';
}

function simPanel(id) {
  const s = simById(id);
  if (!s) return `<h1>There is no sim called "${esc(id)}" in this fix</h1><p class="lede">It may belong to another fix, or the link may be out of date. <a class="link" href="#/fix/214">See the sims for fix 214</a></p>`;
  const st = statusOf(s);
  const follow = s.source !== 'real' ? (s.source === 'pinned' ? '' : 'An AI customer plays the customer throughout.') : 'The customer follows the real messages until the agent behaves differently. Then an AI customer continues.' + (s.group === 'new' ? ' On the current agent it ends the way the recorded conversation did.' : '');
  const dx = S.dispute[s.id] && s.checks.some(r => r[0] === S.dispute[s.id].cid) ? S.dispute[s.id] : null;
  const checkRows = s.checks.map(([cid, b, a]) => {
    const c = CP[cid], j = s.judge && s.judge[cid];
    return `<tr class="click" tabindex="0" data-cp-row="${cid}"><td><b>${esc(c.text)}</b>
      <div class="d">${c.when} · ${c.on.toLowerCase()}, checked by ${c.by === 'Code' ? 'code' : 'the AI judge'} · from ${esc(c.src)}</div>${j ? `<div class="d">The judge's reason: ${esc(j)}</div>` : ''}</td>
      <td class="nowrap">${res(b)}</td><td class="nowrap">${res(a)}${dx && dx.cid === cid ? '<div style="margin-top:4px"><span class="chip amber">Disputed by you</span></div>' : ''}</td></tr>`;
  }).join('');

  let extra = '';
  if (s.id === 'P-03') extra = `<div class="banner"><div><b>${S.simEdit ? `${You()} updated what this sim expects` : S.kept ? `${You()} kept what this sim expects` : 'Autopilot asks to update what this sim expects'}</b>
    ${S.kept ? `This sim was built from the 12 Mar escalation policy. It expects a handoff for every multi-parcel refund, and the fix exists to remove that handoff. So the fix is closed. Autopilot is told that the policy stands, and ${isPm() ? other().name + ' is told' : 'you are told'}.` : S.simEdit ? 'This sim was built from the 12 Mar escalation policy. It checked behavior that the fix changes on purpose. The sim is kept, with the checkpoint below. It now fails on the current agent and passes with the fix.' : 'This sim was built from the 12 Mar escalation policy. It must always pass, so Autopilot cannot edit it. It checks behavior that the fix changes on purpose, so it fails with the fix. Keeping it as it is means the fix cannot be approved.'}
    <div class="diff"><div class="del">Hands off to a specialist when the order has more than one parcel</div><div class="add">Refunds the returned item without handing off, when it was delivered and received back</div></div>
    <div class="actions" style="margin-top:12px">${S.simEdit ? `<span class="chip green">Updated by Sam Okafor on 10 Nov. Ran again: passed 3 of 3.</span>` : S.kept ? `<span class="chip">Kept by Sam Okafor on 10 Nov</span>${isPm() ? '<button class="btn" data-act="unkeep">Change your answer</button>' : ''}` : S.version === 1 ? '<span class="muted">You can decide on this once the payments problem is resolved.</span>' : isPm() ? '<button class="btn primary" data-act="acceptEdit">Update the sim</button><button class="btn" data-act="refuseEdit">Keep it as it is</button>' : '<span class="muted">Sam Okafor owns the escalation rules, so this is his to decide.</span><button class="btn" data-act="askPm">Ask Sam Okafor</button>'}</div></div></div>`;
  if (s.status === 'noise') extra = `<div class="banner"><div><b>An unstable test, and not something the fix broke</b>
    The fix does not touch the Cancellations procedure, and this sim gives mixed results on the agent as it is today. It ran more times on both versions until the two rates could be compared.
    <div class="grid3" style="margin-top:12px">
      <div><div class="label">Last 10 runs before this fix</div><div style="margin-top:4px">${runs(s.history.runs)} <span class="small muted">8 of 10</span></div></div>
      <div><div class="label">5 more runs, current agent</div><div style="margin-top:4px">${runs(s.history.extraBefore)} <span class="small muted">4 of 5</span></div></div>
      <div><div class="label">5 more runs, with the fix</div><div style="margin-top:4px">${runs(s.history.extraAfter)} <span class="small muted">4 of 5</span></div></div>
    </div>
    <p class="note">The same rate on both versions. The failing checkpoint is a style guideline judged by AI.</p>
    <dl class="kv" style="margin-top:12px"><dt>Counted as</dt><dd>Neither a pass nor a failure</dd><dt>If it had differed</dt><dd>A sim that fails more often with the fix than without it is a failure, and is listed as Got worse.</dd><dt>Who fixes it</dt><dd>The sim system</dd><dt>What happens</dt><dd>Listed for cleanup. Nobody needs to act.</dd></dl></div></div>`;
  if (s.status === 'inconclusive') extra = `<div class="banner"><div><b>${s.why.title}</b>${s.why.text}
    <dl class="kv" style="margin-top:12px"><dt>Counted as</dt><dd>Neither a pass nor a failure</dd><dt>Who fixes it</dt><dd>${s.why.owner}</dd><dt>What happens</dt><dd>${s.why.next}</dd></dl></div></div>`;
  if (s.status === 'worse' && s.id !== 'S-13') extra = `<div class="banner red"><div><b>A payments rule is broken, so the fix cannot be approved</b>
    The customer paid $50.00 by gift card and the rest by Visa. Refunds go to the gift card first. The changed agent sent all $84.00 to Visa. The current agent hands this conversation to a specialist.</div></div>`;
  if (s.id === 'S-13') extra = `<div class="banner ${s.status === 'worse' ? 'red' : ''}"><div><b>Built from your answer on fix 214</b>
    No sim covered a multi-parcel item returned after 30 days, and past conversations gave no single answer. You said the agent should ${S.gap === 'decline' ? 'decline and explain the window' : 'hand off to a specialist'}. That is what this sim expects. ${S.gap === 'decline' ? 'With the fix the agent does that, in 3 runs of 3.' : 'With the fix the agent declines without handing off, in 3 runs of 3, so the fix cannot be approved.'} <a class="link" href="#" data-act="gapUndo">Change your answer</a></div></div>`;
  if (s.status === 'fixed' && !S.sandbox && s.id !== 'S-13') extra = `<div class="banner amber"><div><b>This pass relies on an invented reply from the refund tool</b>
    The tool has never been called for one item of a multi-parcel order, so the sim wrote the reply itself. It is checked against the tool's test environment when version 2 is tested.</div></div>`;
  if (s.source === 'var') extra += `<div class="banner"${nw(1)}><div><b>A variation on real conversation #${s.from}</b>
    One detail was changed: ${esc(s.detail)}. What it expects comes from policy, not from the fix. It counts in the result and is labeled wherever it appears.${s.reviewed ? '' : ' Opening it here records that you have read it.'}</div></div>`;
  if (s.source === 'branch') extra += `<div class="banner"${nw(2)}><div><b>No conversation behind it</b>
    Written from ${esc(s.branch)}, a path that no customer has taken yet. There is no real conversation to compare it with, so its result is shown apart from the others. A failure here would read "A failure is possible".</div></div>`;

  if (dx) { const c = CP[dx.cid], e = disputeEffect(s, dx.cid);
    extra = `<div class="banner amber"><div><b>You disputed what this sim expects</b>
    <dl class="kv" style="margin-top:8px"><dt>Checkpoint</dt><dd>${esc(c.text)}</dd><dt>You said</dt><dd>${esc(dx.note)}</dd><dt>Sent to</dt><dd>${esc(e.to)}</dd><dt>The fix</dt><dd>${e.fix}</dd><dt>Next</dt><dd>${e.then}</dd></dl>
    <div class="actions" style="margin-top:12px"><button class="btn" data-act="undispute">Withdraw</button></div></div></div>` + extra; }
  const canDispute = s.id !== 'P-03' && !dx;
  const tools = s.tools.map(t => `<div class="tool"><div class="t"><span class="mono">${t.name}</span><span class="tag ${t.tag === 'Invented' ? (S.sandbox ? 'ok' : 'inv') : ''}">${t.tag === 'Invented' && S.sandbox ? 'Invented, confirmed' : t.tag}</span></div><p>${esc(t.tag === 'Invented' && S.sandbox ? 'Invented, then confirmed against the tool\'s test environment on 10 Nov.' : t.note)}</p></div>`).join('');
  const col = (title, side, r) => `<div class="card"><div class="col-h"><span>${title}</span>${runs(r)}</div><div class="col-b"><div class="thread">${side.turns.map(turnHtml).join('')}</div><div class="endstate"${side === s.after ? nw(0) : ''}><b>How it ended, and the final account state.</b> ${esc(side.end)}</div></div></div>`;
  const openScn = !!S.open.scn;

  return `<h1>${esc(s.title)}</h1>
  <p class="lede"><span class="chip ${st[0]}">${st[1]}</span>&nbsp; ${s.id} · ${s.source === 'pinned' ? 'Must always work, written by a person' : sourceLabel(s)}. ${follow}</p>
  ${extra}
  <div class="section" style="margin-top:20px"><div class="cols">${col('Current agent', s.before, s.runsBefore)}${col(`With the fix${s.afterLabel ? ` <span class="muted small" style="font-weight:400">${s.afterLabel}</span>` : ''}`, s.after, s.runsAfter)}</div></div>
  <div class="section"${nw(0)}><div class="section-head"><h2>Checkpoints</h2><p>What must be true, not the exact words. Select one to find it in the conversation.</p></div>
  <div class="card tablecard"><table class="tbl"><thead><tr><th>Checkpoint</th><th>Current agent</th><th>With the fix</th></tr></thead><tbody>${checkRows}</tbody></table></div>
  ${canDispute && vars() ? `<p class="note"${nw(1)}>Does a checkpoint expect the wrong thing? <a class="link" href="#" data-act="dispute">Dispute this sim</a></p>` : ''}</div>
  <div class="section"><div class="card rows"><div class="row ${openScn ? 'open' : ''}"><button class="row-h" data-act="toggle" data-id="scn" aria-expanded="${openScn}"><span><b>The scenario and the tool replies</b><span class="why">No real system is touched. Each tool reply is recorded from history or invented.</span></span><span></span>${ICON.chev}</button>
    ${openScn ? `<div class="row-b pad"><dl class="kv"><dt>Customer</dt><dd>${esc(s.scenario.customer)}</dd><dt>Wants</dt><dd>${esc(s.scenario.goal)}</dd><dt>Order</dt><dd>${esc(s.scenario.order)}</dd><dt>Details</dt><dd>${s.scenario.parcels.map(esc).join('<br>')}</dd></dl><div style="margin-top:12px">${tools}</div></div>` : ''}</div></div></div>`;
}

function changePanel() {
  const v2 = S.version === 2;
  const item = (kind, title, text) => `<li>${mk(kind, 1)}<span><b>${title}</b> ${text}</span></li>`;
  return `<h1>What changes in the agent</h1><p class="lede">One step of the Refunds procedure.</p>
  <div class="diff" style="margin-top:14px"><div class="hd">Refunds, step 4</div>
<div class="ctx">  3. Look up the order.</div>
<div class="del">  4. If the order has more than one shipment, hand off to a specialist.</div>
<div class="add">  4. If the order has more than one shipment:</div>
<div class="add">     a. Check the return status of each returned item.</div>
<div class="add">     b. Refund only items that were delivered and have been received back,</div>
<div class="add">        within 30 days of that item's delivery date.</div>
${v2 ? '<div class="add">     c. If any part of the order was paid by gift card, hand off to a specialist.</div>' : ''}
<div class="ctx">  5. Tell the customer the amount, where it goes, and when to expect it.</div></div>
  ${v2 ? '<p class="note">Line 4c was added in version 2, after you sent the fix back.</p>' : ''}
  <div class="section"><div class="section-head"><h2>What changes in the tests</h2><p>A change to a test is reviewed like a change to the agent.</p></div>
  <div class="card pad"><ul class="draft-why" style="gap:10px;font-size:var(--f3)">
    ${!unseen() ? '' : item(S.simEdit ? 'ok' : S.kept ? 'no' : 'open', S.simEdit ? '1 sim that must always pass was updated.' : S.kept ? '1 sim that must always pass was kept as it is.' : '1 sim that must always pass would be updated.', `"Complex refunds go to a specialist". Autopilot cannot change it. It can only ask. ${S.simEdit ? 'You updated it on 10 Nov.' : '<a class="link" href="#/sim/P-03">See P-03</a>'}`)}
    ${v2 ? item('ok', '1 new sim now expects a handoff.', 'The gift card order. In version 1 it expected a refund. It now expects a handoff, following your instruction. <a class="link" href="#/sim/S-12">See S-12</a>') : ''}
    ${item('ok', `${made()} new sims are kept.`, `${vars() ? '9 come' : 'They come'} from the real conversations that exposed the issue${unseen() ? ', 2 are variations on them and 1 was written from the new procedure steps' : vars() ? ' and 2 are variations on them' : ''}. They are ${S.approved ? 'kept now that the fix is approved' : 'kept if the fix is approved'}, and run on every later change to Refunds.`)}
    ${!vars() ? '' : item('ok', '0 existing sims edited or removed by Autopilot.', 'Autopilot can add sims. It cannot remove one or loosen a checkpoint without showing it here.')}
  </ul></div></div>`;
}

function testedPanel() {
  const max = Math.max(...COVERAGE.map(c => c.conv));
  const rows = COVERAGE.map(c => {
    const pct = (100 * c.conv / N.refundConv).toFixed(1).replace('.0', '');
    let simsCell = c.added ? `${c.before} <span class="muted">to</span> <b>${c.before + c.added}</b>` : `${c.before}`;
    let note = c.touched ? 'Changed by this fix' : '';
    if (c.nosim) { simsCell = S.gap ? '0 <span class="muted">to</span> <b>1</b>' : '<span class="res unk">No sim</span>';
      note = S.gap ? `Changed by this fix. S-13 was built from your answer and ${S.gap === 'decline' ? 'passes' : 'fails with the fix'}.` : 'Changed by this fix. Past conversations do not give one expected outcome, so no sim was written. <a class="link" href="#/fix/214">Answer on the fix page</a>'; }
    if (c.gap) { simsCell = '0 <span class="muted">in this run</span>'; note = '3 sims were added after this run. <a class="link" href="#/sets">See them</a>'; }
    return `<tr><td>${esc(c.branch)}${note ? `<div class="d">${note}</div>` : ''}</td>
      <td><div class="share"><div class="b"><i style="width:${100 * c.conv / max}%"></i></div><span>${pct}%</span></div></td>
      <td class="right num">${c.conv.toLocaleString()}</td><td class="nowrap num right">${simsCell}</td></tr>`;
  }).join('');
  const added = [...made0(), GIFT[S.version]].map(s => {
    const why = s.source === 'real' && s.status === 'scope' ? 'Matches the real conversation: it hands off on the current agent as the real one did, 3 runs of 3.'
      : s.source === 'real' ? 'Reproduces the real failure: it fails on the current agent the way the real conversation did, 3 runs of 3.'
      : s.source === 'var' ? `${isUnread(s) ? '<span class="res unk">Not yet read by a person.</span>' : 'Read by a person.'} A real conversation with one detail changed. Its expected outcome comes from policy.` : 'Read by a person. No real conversation to compare with.';
    return `<tr class="click" tabindex="0" data-go="#/sim/${s.id}"><td><b>${esc(s.title)}</b><div class="d">${s.id} · ${sourceLabel(s)}</div></td><td class="small t2">${why}</td></tr>`;
  }).join('');
  const step = (title, text, fig) => `<li><b>${title}</b><span>${fig}</span><p>${text}</p></li>`;
  const lede = !vars() ? `<b>Finished in 6 minutes.</b> ${9 + RECENT} sims, on both agents. Each is a real conversation, run to its end by an AI that plays the real customer.`
    : `<b>Finished in ${RUN().time}.</b> ${N.all} sims and ${RUN().runs} runs, in parallel, on both agents. ${earned() ? 'Sims are selected for each fix by its risk and by how often the sims have been right in its area. Risk is high because the change moves money, so this is the widest selection.' : 'Every sim runs on every fix, whatever its risk.'}`;
  const invented = step('Check any tool reply the sims invented', S.version === 2 ? 'The refund tool had never been called for one item of a multi-parcel order, so the sims wrote its reply. The tool was called in its test environment, and the reply matched on 5 of 5 fields.' : 'The refund tool has never been called for one item of a multi-parcel order, so the sims wrote its reply. It is checked against the tool\'s test environment once the fix passes the steps above.', S.version === 2 ? '1 call' : 'Not run yet');
  const recent = step('Conversations the fix should not touch', `${RECENT} recent conversations, picked at random from the last 30 days, simulated the same way on both agents.`, `${RECENT} sims`);
  const steps = !vars() ? `
    ${step('Reproduce the failure', '9 real conversations simulated on the current agent. All 9 end the way the recorded ones did, so the AI customer behaves as the real customers did.', '9 sims')}
    ${step('Test the fix', 'The same 9 on the changed agent. An AI customer carries each one to its end, 3 times. An AI judge grades the wording, and code checks the final account state.', '27 runs')}
    ${recent}
    ${invented}`
  : `
    ${step('Reproduce the failure', '9 real conversations replayed on the current agent. All 9 end the way the real ones did, so the sims test the right thing.', '9 sims')}
    ${step('Test the fix', `The same 9 on the changed agent, plus 2 variations on them${unseen() ? ' and 1 written from the new procedure steps' : ''}.`, `${made()} sims`)}
    ${unseen() ? step('Everything that must always work', 'Every rule the agent may never break. These run on every change, whatever the risk.', `${N.found} sims`) : ''}
    ${step('What sits next to the change', '34 sims in the same procedure, and 18 from other procedures that call the refund tool or read multi-parcel orders.', `${N.near} sims`)}
    ${earned() ? step('A sample of everything else', 'Chosen at random, in case the change reaches further than expected.', `${N.sample} sims`) : step('Everything else', 'Every other sim in the test sets, in case the change reaches further than expected.', `${N.sample} sims`)}
    ${step('More runs where the answer was unclear', '1 sim gave mixed results. It ran 5 more times on each version, until the two rates could be compared.', '10 runs')}
    ${invented}`;
  return `<h1>How it was tested</h1><p class="lede">${lede}</p>
  <div class="card" style="margin-top:14px"><ol class="steps">${steps}
  </ol></div>
  ${vars() ? `<p class="note">${earned() ? 'A low-risk fix, such as new wording in one article, runs steps 1 to 3 and a smaller sample.' : 'A low-risk fix, such as new wording in one article, runs the same steps.'} Test sets version ${TS.version} was held fixed for this run.</p>` : ''}
  ${unseen() ? `<div class="section"${nw(2)}><div class="section-head"><h2>What is covered in the Refunds procedure</h2><p>${N.refundConv.toLocaleString()} refund conversations in 30 days</p></div>
  <div class="card tablecard"><table class="tbl"><thead><tr><th>Situation</th><th>Share of refund conversations</th><th class="right">Conversations</th><th class="right">Sims</th></tr></thead><tbody>${rows}</tbody></table></div></div>` : ''}
  ${vars() ? `<div class="section"><div class="section-head"><h2>${made()} sims created for this fix</h2><p>Why each sim itself can be believed</p></div>
  <div class="card tablecard"><table class="tbl"><thead><tr><th>Sim</th><th>Why we believe it</th></tr></thead><tbody>${added}</tbody></table></div></div>` : ''}`;
}

function panel(p) {
  if (!p.panel) return '';
  let where = '', nav = '', body;
  if (p.panel === 'sim') {
    const order = simOrder(), i = order.findIndex(s => s.id === p.id);
    where = i < 0 ? 'Sim' : vars() ? `Sim ${i + 1} of ${order.length} that changed, were fixed or could not be used` : `Conversation ${i + 1} of ${order.length}`;
    nav = i >= 0 ? `<button class="btn ghost" data-act="prevSim" ${i === 0 ? 'disabled' : ''} >Previous <kbd>K</kbd></button><button class="btn ghost" data-act="nextSim" ${i === order.length - 1 ? 'disabled' : ''} >Next <kbd>J</kbd></button>` : '';
    body = simPanel(p.id);
  } else { where = 'Fix 214'; body = p.panel === 'change' ? changePanel() : testedPanel(); }
  const fresh = S.lastPanel === null ? 'in' : '';
  return `<div class="scrim ${fresh}" data-act="closePanel"></div><aside class="panel ${fresh}" role="dialog" aria-label="Details" tabindex="-1">
    <div class="panel-h"><span class="where">${where}</span>${nav}<a class="btn ghost" href="#/fix/214">Close <kbd>Esc</kbd></a></div>
    <div class="panel-b" data-key="${p.panel}:${p.id || ''}">${body}</div></aside>`;
}

// ---------- Test sets ----------
// [chip colour, internal state, words shown]
const DRAFT_WORD = {Joined: 'In use', 'Needs you': 'Needs your answer', Rewrite: 'Being rewritten'};
const CHECK_NAME = ['Expected outcome has a source', 'Replays the real conversation', 'Can fail', 'Is well formed'];
function draftState(d) {
  if (d.ask) return S.d4 ? ['green', 'Joined'] : ['amber', 'Needs you'];
  if (d.loose) return ['', 'Rewrite'];
  return ['green', 'Joined'];
}
const draftWord = d => DRAFT_WORD[draftState(d)[1]];
function checksLine(d) {
  const ch = draftChecks(d), bad = [...ch].findIndex(c => c !== 'y');
  return bad < 0 ? 'Passed 4 of 4 checks' : `Passed 3 of 4. ${d.ask ? 'Its expected outcome has no source' : 'It could not fail'}`;
}
function draftChecks(d) { return d.ask && S.d4 ? 'yyyy' : d.checks; }
function drafts() {
  const base = TS.drafts.map(d => ({...d, from: `Real conversation #${d.conv}`}));
  const intl = [
    {id: 'I-1', title: 'International return, item already received', from: 'Real conversation #89961', checks: 'yyyy', outcome: 'Refund the item, not the original shipping', source: 'Written policy: International returns'},
    {id: 'I-2', title: 'International return where customs duty was charged', from: 'Real conversation #90020', checks: 'yyyy', outcome: 'Refund the item and explain that duty is reclaimed from the carrier', source: 'What the human agent did after the handoff'},
    {id: 'I-3', title: 'International return outside the 30-day window', from: 'Real conversation #89874', checks: 'yyyy', outcome: 'Decline, and explain the 30-day window', source: 'Written policy: Refunds, section 3'},
  ];
  return [...base, ...intl];
}
function draftList(list) {
  return list.map(d => {
    const stt = draftState(d), ch = draftChecks(d), open = !!S.open['d:' + d.id];
    const why = [
      ch[0] === 'y' ? `<b>The expected outcome has a source.</b> ${d.ask ? (S.d4 === 'yes' ? 'Match the price, after the discount' : 'Decline, discounted items do not qualify') : esc(d.outcome)}. Source: ${d.ask ? 'your ruling on 10 Nov' : esc(d.source)}.` : `<b>The expected outcome has no source.</b> The real conversation was handed off and the specialist left no notes. The price match policy does not mention discount codes.`,
      `<b>It replays the real conversation.</b> It ends the way the real conversation did on the current agent, in 3 runs out of 3.`,
      ch[2] === 'y' ? `<b>It can fail.</b> A copy of the agent with the price check removed fails it.` : `<b>It cannot fail yet.</b> A copy of the agent with the price check removed still passed, so its checkpoint is being rewritten to be stricter.`,
      `<b>It is well formed.</b> The simulated customer stayed in character and the order record is possible.`,
    ];
    return `<div class="draft click" role="button" tabindex="0" data-act="toggle" data-id="d:${d.id}" aria-expanded="${open}"><span><b>${esc(d.title)}</b><span class="d"> ${d.id} · ${d.from}</span></span>
      <span class="checks4 ${ch === 'yyyy' ? '' : 'short'}">${checksLine(d)}</span><span class="chip ${stt[0]}">${DRAFT_WORD[stt[1]]}</span>
      ${open ? `<ul class="draft-why">${why.map((w, i) => `<li>${mk(ch[i] === 'y' ? 'ok' : 'open', 1)}<span>${w}</span></li>`).join('')}</ul>` : ''}</div>`;
  }).join('');
}

function setsPage(p) {
  const ds = drafts();
  const joined = ds.filter(d => draftState(d)[1] === 'Joined').length;
  const need = ds.filter(d => draftState(d)[1] === 'Needs you').length;
  const evolving = N.evolving - 6 + joined + (S.approved ? made() : 0);
  const tab = (id, href, label) => `<a href="${href}" class="${p.tab === id ? 'on' : ''}">${label}</a>`;
  const head = `<div class="head"><div><h1>Test sets</h1>
    <div class="sub">${unseen() ? 'Every fix is tested against two sets of sims. One holds what must always work, and no fix can change it. The other is refreshed from recent conversations on a schedule you set, so it follows what customers ask now.' : 'Every fix is tested against a set of sims. Each sim is a real conversation, or a real conversation with one detail changed. The set is refreshed from recent conversations on a schedule you set, so it follows what customers ask now.'}</div>
    <div class="meta">Version ${TS.version}, refreshed 10 Nov from ${TS.conversations.toLocaleString()} conversations</div></div></div>
    ${unseen() ? `<div class="tabs">${tab('week', '#/sets', 'This week')}<span${nw(2)}>${tab('coverage', '#/sets/coverage', 'Coverage')}${tab('foundational', '#/sets/foundational', 'Must always work')}</span></div>` : ''}`;

  if (p.tab === 'coverage') {
    const maxShare = Math.max(...TS.intents.map(i => i.share)), maxSim = Math.max(...TS.intents.map(i => 100 * i.sims / N.evolving));
    const iRows = TS.intents.map(i => {
      const pm = i.flag === 'new' ? ds.filter(d => d.id[0] === 'D' && draftState(d)[1] === 'Joined').length : 0;
      const intl = i.flag === 'under' ? ds.filter(d => d.id[0] === 'I' && draftState(d)[1] === 'Joined').length : 0;
      const n = i.flag === 'fading' ? 0 : i.sims + pm + intl + (i.flag === 'under' && S.approved ? made() : 0);
      const sp = 100 * n / evolving;
      const note = i.flag === 'new' ? `New. ${pm} of 5 new sims in use.` : i.flag === 'under' ? (S.approved ? `Was thinly covered. Fix 214 added ${made()}.` : `Thinly covered, with recurring failures. Fix 214 would add ${made()}.`) + (intl ? ` ${intl} international return sims added.` : '') : i.flag === 'fading' ? '6 sims retired this week.' : '';
      return `<tr><td>${i.name}${note ? `<div class="d">${note}</div>` : ''}</td><td><div class="share"><div class="b"><i style="width:${100 * i.share / maxShare}%"></i></div><span>${i.share.toFixed(1)}%</span></div></td>
        <td><div class="share"><div class="b s"><i style="width:${Math.min(100, 100 * sp / maxSim)}%"></i></div><span>${sp.toFixed(1)}%</span></div></td><td class="right num">${n}</td></tr>`;
    }).join('');
    const flRows = TS.floors.map(f => `<tr><td><b>${f.name}</b>${f.note ? `<div class="d">${f.note}</div>` : ''}</td><td class="num">${f.share}</td><td class="right num">${f.floor}</td><td class="right num">${f.has}</td><td class="nowrap">${f.has >= f.floor ? '<span class="res pass">Covered</span>' : '<span class="res unk">1 short</span>'}</td></tr>`).join('');
    return head + `<div class="section-head"><h2>What customers ask, against what the sims test</h2><div class="legend"><span><i></i>Conversations</span><span><i class="s"></i>Sims</span></div></div>
    <div class="card tablecard" id="sharetable"><table class="tbl"><thead><tr><th>Area</th><th>Share of conversations</th><th>Share of sims</th><th class="right">Sims</th></tr></thead><tbody>${iRows}</tbody></table></div>
    <p class="note">The two shares need not match. A simple area needs fewer sims than its traffic suggests. A wide gap is a reason to look.</p>
    <div class="section"><div class="section-head"><h2>Rare cases that are always kept</h2><p>Each has a minimum number of sims that does not depend on traffic.</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Case</th><th>Share of conversations</th><th class="right">Minimum</th><th class="right">Has</th><th></th></tr></thead><tbody>${flRows}</tbody></table></div></div>`;
  }

  if (p.tab === 'foundational') {
    const fRows = TS.foundational.map(f => `<tr><td><b>${f.group}</b><div class="d">For example: ${esc(f.example)}</div></td><td class="right num">${f.n}</td><td class="nowrap">${f.owner}</td><td class="nowrap muted">${f.edit && S.simEdit ? '10 Nov' : f.changed}</td>
      <td class="nowrap">${f.edit ? (S.simEdit ? '<span class="chip green">1 sim updated by you</span>' : S.version === 2 && !S.running ? '<a class="chip amber" href="#/sim/P-03">Fix 214 asks to update 1 sim</a>' : '') : ''}</td></tr>`).join('');
    return head + `<div class="section-head"><h2>Rules the agent may never break</h2><p>${N.found} sims, all run on every change</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Rule group</th><th class="right">Sims</th><th>Owner</th><th>Last changed</th><th></th></tr></thead><tbody>${fRows}</tbody></table></div>
    <p class="note">Only a person changes this set. Autopilot can ask for a change and cannot make one. Every test run holds a version of both sets fixed, and both versions of the agent run on it. Trends over time are read from these sims only, because they do not change from week to week.</p>`;
  }

  const pm = ds.filter(d => d.id[0] === 'D'), intl = ds.filter(d => d.id[0] === 'I');
  const pmJoined = pm.filter(d => draftState(d)[1] === 'Joined').length;
  const chosen = 5 + 9 + 3, pool = 660 + 212 + 87;
  const shift = (id, title, why, fig, body) => { const open = !!S.open[id];
    return `<div class="row ${open ? 'open' : ''}"><button class="row-h" data-act="toggle" data-id="${id}" aria-expanded="${open}"><span><b>${title}</b><span class="why">${why}</span></span><span class="fig">${fig}</span>${ICON.chev}</button>${open ? `<div class="row-b ${body.startsWith('<div class="draft') ? '' : 'pad'}">${body}</div>` : ''}</div>`; };
  const needs = need ? `<div class="card needs">${mk('open')}<div><h2>Does an item bought with a discount code qualify for a price match?</h2>
      <p>A new sim cannot be used until this is answered. The real conversation was handed off with no notes, and the price match policy does not mention discount codes. Your answer becomes what the sim expects, with your name as its source. There were 41 conversations like it in the last 3 weeks.</p>
      <div class="row"><button class="btn primary" data-act="d4" data-v="yes">Yes, match the price after the discount</button><button class="btn" data-act="d4" data-v="no">No, decline</button></div></div></div>`
    : `<div class="card needs">${mk('ok')}<div><h2>Nothing is waiting for you</h2><p>${S.d4 ? 'Your answer on discount codes is now what the sim expects. It is in use.' : ''}</p></div></div>`;
  const VARS = [['#88019, Omar H.', 'Paid in full by gift card, not partly', 'Refund goes back to the gift card', 'Rule: Payments'], ['#88213, Maya R.', 'The order ships in three parcels, not two', 'Refund the returned item only', 'Procedure: Refunds, step 4b'],
    ['#88213, Maya R.', 'The other parcel is still in transit', 'Refund the returned item only', 'Procedure: Refunds, step 4a'], ['#87440, Daniel O.', 'The customer is angry and asks for a manager', 'Refund the returned item, and hand off if the customer asks again', 'Policy: Escalation, 12 Mar']];
  const variations = `<div class="section"${nw(1)}><div class="section-head"><h2>Variations on real conversations</h2><p>One detail is changed. What the sim expects comes from policy.</p></div>
    <div class="card tablecard"><table class="tbl"><thead><tr><th>Real conversation</th><th>Detail changed</th><th>What the sim expects</th><th>Taken from</th></tr></thead><tbody>${VARS.map(v => `<tr><td><b>${v[0]}</b></td><td>${v[1]}</td><td>${v[2]}</td><td class="muted">${v[3]}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">4 of the variations written this week, from the conversations behind fix 214. A variation is not read one by one. You can dispute any sim that expects the wrong thing.</p></div>`;
  return head + `<div class="${unseen() ? 'grid2' : ''}">
    ${!unseen() ? '' : `<div class="card layer"${nw(2)}><h3>Must always work<span>changes only when the rule behind it changes</span></h3><p>Rules the agent may never break. All of them run on every fix.</p>
      <div class="k"><span><b>${N.found}</b>sims</span><span><b>3</b>owners</span><span><b>${S.simEdit ? '10 Nov' : '2 Oct'}</b>last changed</span></div></div>`}
    <div class="card layer"><h3>From recent conversations<span>refreshed weekly</span></h3><p>What customers are asking now. New sims are added and stale ones retired.</p>
      <div class="k"><span><b id="evolving">${tw('evolving', evolving)}</b>sims</span><span><b>${joined + (S.approved ? made() : 0)}</b>added this week</span><span><b>6</b>retired</span></div></div>
  </div>${variations}
  <div class="section"><div class="section-head"><h2>Waiting for you</h2></div>${needs}</div>
  <div class="section"><div class="section-head"><h2>What changed this week</h2><p>How the sims were brought up to date with what customers ask</p></div>
  <div class="card rows">
    <div class="pipe">
      <div><div class="step">1. Changes in what customers ask</div><b>4 found</b><span>and 1 one-day spike left out</span></div>
      <div><div class="step">2. Real conversations picked</div><b>${chosen} of ${pool.toLocaleString()}</b><span>one for each distinct situation</span></div>
      <div><div class="step">3. New sims that passed their checks</div><b>${joined} of ${ds.length}</b><span>${ds.length - joined ? `${ds.length - joined} not in use yet` : 'all in use'}</span></div>
      <div><div class="step">4. Sims retired</div><b>6</b><span>for a topic customers stopped asking about</span></div>
    </div>
    ${shift('price', 'Price match requests are new', 'From 0.4% to 2.1% of conversations in 3 weeks. A competitor began a sale on 20 Oct.', `${pmJoined} of 5 new sims in use`, draftList(pm))}
    ${shift('intl', 'International returns had no sims', '87 conversations in 30 days, inside the Refunds procedure.', '3 of 3 new sims in use', draftList(intl))}
    ${shift('multi', 'Refunds on multi-parcel orders keep failing', '212 conversations, 94% handed off.', S.approved ? `${made()} sims added` : 'Autopilot proposed fix 214', `<p class="t2">${S.approved ? `Its ${made()} sims were added when you approved fix 214.` : `Autopilot turns a recurring failure into a proposed fix. The ${made()} sims written to test it are kept if you approve it.`} <a class="link" href="#/fix/214">See fix 214</a></p>`)}
    ${shift('fade', 'Holiday shipping cut-off has faded', 'From 3.2% to 0.1% of conversations since January.', '6 sims retired', '<p class="t2">Retired sims are kept, not deleted. They come back if customers start asking again.</p>')}
    ${shift('spike', 'A site outage on 4 Nov was left out', '1,140 conversations in one day, and none since.', 'No sims added', '<p class="t2">A topic has to last 2 weeks before sims are built for it, so a one-day event does not skew the tests.</p>')}
  </div>
  <p class="note">A new sim is used only after it passes four checks: its expected outcome has a source, it replays the real conversation, it can fail, and it is well formed. Open one to see them.</p></div>`;
}

// ---------- Sim accuracy ----------
function healthPage() {
  const H = HEALTH;
  const gRow = (title, id, before, predicted, actual, result, diff, sub) => `<tr><td><b>${esc(title)}</b><div class="d">Fix ${id}</div></td><td class="num right" data-l="Before">${before}%</td><td class="num right" data-l="Sims predicted">${predicted}%</td><td class="num right" data-l="Real, after 7 days">${actual === null ? '<span class="muted">None</span>' : `<b>${actual}%</b>`}</td>
    <td class="scale-c">${scale(before, predicted, actual)}</td><td>${result}<div class="d">${diff}</div></td></tr>${sub ? `<tr class="sub"><td></td><td colspan="5">${sub}</td></tr>` : ''}`;
  const pending = (S.approved ? gRow('Refunds on multi-parcel orders', 214, 94, 15, null, '<span class="res na">Not checked yet</span>', 'Checked on 17 Nov') : '')
    + (auto() ? gRow('Old shipping times for Canada', 213, 19, 6, null, '<span class="res na">Not checked yet</span>', 'Started on its own. Checked on 17 Nov') : '');
  const waitIds = [S.approved ? 214 : 0, auto() ? 213 : 0].filter(Boolean);
  const gains = H.predictions.map(p => { const g = predGap(p), over = g !== null && g > H.within;
    return gRow(p.title, p.id, p.before, p.predicted, p.actual,
      g === null ? '<span class="res na">Not measured</span>' : `<span class="res ${over ? 'fail' : 'pass'}">${over ? 'Overstated the gain' : 'Held'}</span>`,
      g === null ? esc(p.noActual) : `Real was ${gapWords(p).replace(' than predicted', '')}`,
      over ? `<b>Why.</b> ${esc(p.why)} <b>Since then.</b> ${esc(p.since)}` : ''); }).join('');
  const wrong = H.predictions.filter(p => p.said), rest = H.predictions.length - wrong.length;
  const safety = wrong.map(p => `<tr><td><b>${esc(p.title)}</b><div class="d">Fix ${p.id}</div></td><td>${esc(p.said)}</td><td>${esc(p.happened)}</td><td>${predRes(p)}</td><td class="t2">${esc(p.why)} ${esc(p.since)}</td></tr>`).join('')
    + `<tr><td><b>The other ${rest} fixes</b><div class="d">Fixes ${H.predictions.filter(p => !p.said).map(p => p.id).join(', ')}</div></td><td>Nothing else would break</td><td>Nothing else broke</td><td><span class="res pass">Held</span></td><td></td></tr>`;
  const miss = (n, kind, what, p) => `<div class="miss"><div class="label">${kind}</div><div class="stat">${n} <small>of 20</small></div><p>${what}</p><p class="since"><b>Since then.</b> ${esc(p.since)}</p></div>`;
  const P = id => H.predictions.find(p => p.id === id);
  const areas = H.areas.map(a => { const ok = holds(a);
    return `<tr><td>${a.area}</td><td class="num"><b>${a.held} of ${a.of}</b></td>${earned() ? `<td class="small t2">${ok ? (auto() ? 'Low-risk fixes start at 10% on their own' : 'Low-risk fixes get a short review, and could start at 10% without waiting') : a.of < 5 ? 'Too few predictions to say' : 'Every fix waits for a person'}</td>` : ''}</tr>`; }).join('');
  const judge = H.judge.map(j => `<tr><td>${esc(j.check)}${j.low ? '<div class="d">Below 90%. Results from this checkpoint are advisory and never block a fix.</div>' : ''}</td><td class="nowrap num"><b>${j.agree}%</b></td><td class="muted nowrap num">${j.n} labeled</td></tr>`).join('');
  const real = H.realism.map(r => `<tr><td>${esc(r.b)}</td><td class="nowrap num">${r.real}%</td><td class="nowrap num"><b>${r.sim}%</b></td></tr>`).join('');
  const row = (id, title, why, fig, body) => { const open = isOpen(id);
    return `<div class="row ${open ? 'open' : ''}"${id === 'replay' || id === 'judge' || id === 'real' ? nw(0) : id === 'fit' ? nw(1) : id === 'areas' ? nw(3) : ''}><button class="row-h" data-act="toggle" data-id="${id}" aria-expanded="${open}"><span><b>${title}</b><span class="why">${why}</span></span><span class="fig">${fig}</span>${ICON.chev}</button>${open ? `<div class="row-b">${body}</div>` : ''}</div>`; };
  const dayOne = `${row('bad', 'Known-bad changes the sims caught', '10 past fixes were undone on a copy of the agent, to see if the sims notice.', '8 of 10', '<p class="t2" style="padding:14px 16px">The sims flagged 8. The 2 they missed now have sims.</p>')}
    ${row('good', 'Known-good changes the sims passed', '10 changes known to be safe were tested, to see if the sims raise a false alarm.', '9 of 10', '<p class="t2" style="padding:14px 16px">The sims passed 9. The 1 they failed had a wrong expected outcome. That sim is corrected.</p>')}
    ${row('judge', 'The AI judge against your reviewers', 'Reviewers label a sample each month without seeing the judge\'s answer.', '2 of 3 above 90%', `<table class="tbl"><thead><tr><th>Judged checkpoint</th><th>Agreement</th><th>Sample</th></tr></thead><tbody>${judge}</tbody></table>
      <p class="note" style="padding:0 14px 14px">Checkpoints checked by code, such as refund amounts and tool calls, are exact and not listed.</p>`)}
    ${row('replay', 'Does the AI customer end where the real customer did?', 'Each sim of a real conversation is run on the current agent and compared with the recording.', '471 of 500', `<table class="tbl"><thead><tr><th>Sims of real conversations, last 30 days</th><th>Sims</th></tr></thead><tbody>
      <tr><td>Ended the way the recorded conversation did</td><td class="nowrap num"><b>471</b></td></tr><tr><td>The AI customer gave up sooner than the real customer</td><td class="nowrap num">18</td></tr><tr><td>The AI customer gave a detail the real customer had not</td><td class="nowrap num">11</td></tr></tbody></table>
      <p class="note" style="padding:0 14px 14px">A sim that ends differently is not used to test a fix. ${vars() ? 'The 9 sims of real conversations made for fix 214 all' : `All ${9 + RECENT} sims on fix 214`} passed this check.</p>`)}
    ${row('real', 'The AI customer against real customers', 'The AI customer is easier than real ones.', 'Told apart 61% of the time', `<table class="tbl"><thead><tr><th>Behavior, as a share of conversations</th><th>Real</th><th>Simulated</th></tr></thead><tbody>${real}</tbody></table>
      <p class="note" style="padding:0 14px 14px">That is why "Return label resend" overstated its gain. In a blind test, reviewers picked out the simulated conversation 61% of the time. 50% would mean they cannot tell.</p>`)}`;
  return `<div class="head"><div><h1>Sim accuracy</h1>
    <div class="sub">Before a fix goes live, its sims predict two things: how far handoffs will fall, and that nothing else will break. This page checks both against real conversations, 7 days after the fix goes live.</div></div></div>
  <div class="card pad acc"><div class="acc-h"><div><h2>The sims were right about 17 of the last 20 fixes</h2>
    <p>The sims predict two things for each fix. They were <b>right</b> about a fix when both held: handoffs fell to within ${H.within} points of the prediction, and what the sims said would break, or would not, matched what happened.</p></div>
    <div class="dotrow">${dots(17, 20)}<span class="small muted">17 right, 3 not</span></div></div>
    <div class="misses">
      ${miss(1, 'Said a fix was safe, and it was not', 'Fix 196 broke pausing a subscription that has a discount. This is the miss that matters most.', P(196))}
      ${miss(1, 'Promised more than it delivered', 'Fix 188 was predicted to cut handoffs to 10%. They fell to 31%.', P(188))}
      ${miss(1, 'Raised a false alarm', 'A sim said fix 185 would give a wrong delivery date. It did not.', P(185))}
    </div>
    <div class="means"><b>What this means for your next approval.</b> A result of "nothing else breaks" has been wrong once in 20, where no sim covered the situation, so check how well the area is covered. Read a predicted gain as the best case: real customers are harder than simulated ones.</div></div>
  <div class="section"><div class="section-head"><h2>Did handoffs fall as far as the sims predicted?</h2><p>${waitIds.length ? `${waitIds.length > 1 ? 'Fixes' : 'Fix'} ${waitIds.join(' and ')}, which ${waitIds.length > 1 ? 'are' : 'is'} not checked yet, and the 8 most recent fixes that have been.` : 'The 8 most recent fixes.'} Handoff rate, as a share of that fix's conversations.</p></div>
  <div class="card tablecard"><table class="tbl acc-t"><thead><tr><th>Fix</th><th class="right">Before</th><th class="right">Sims predicted</th><th class="right">Real, after 7 days</th>
    <th class="scale-c"><span class="scale-k"><span><i class="b"></i>Before</span><span><i class="p"></i>Predicted</span><span><i class="a"></i>Real</span></span></th><th>Handoff prediction</th></tr></thead><tbody>${pending}${gains}</tbody></table></div>
  <p class="note scale-n">Each line runs from 0% to 100%. The closer the dark dot is to the blue mark, the better the prediction. Lower is better for all three.</p></div>
  <div class="section"><div class="section-head"><h2>Did the sims catch what would break?</h2><p>The 8 most recent fixes that have been checked.</p></div>
  <div class="card tablecard"><table class="tbl"><thead><tr><th style="width:18%">Fix</th><th style="width:16%">Sims said</th><th style="width:22%">What happened in real conversations</th><th style="width:14%">Safety prediction</th><th>Why, and what changed since</th></tr></thead><tbody>${safety}</tbody></table></div></div>
  <div class="section"><div class="section-head"><h2>Why the sims can be wrong, and how each cause is measured</h2></div><div class="card rows">
    ${row('areas', 'The record by area of the agent', 'Where the sims have earned trust, and where they have not.', auto() ? '<span class="chip green">In use</span>' : earned() ? '<span class="chip blue">Proposal</span>' : '', `<table class="tbl"><thead><tr><th>Area</th><th>Predictions that held</th>${earned() ? `<th>${auto() ? 'What the record allows' : 'What the record would allow'}</th>` : ''}</tr></thead><tbody>${areas}</tbody></table>
      <p class="note" style="padding:0 14px 14px">${auto() ? 'Rule in use: where at least 5 predictions have all held, a low-risk fix starts at 10% of conversations and you are told afterwards. One miss returns the area to full review. A fix that moves money or cannot be undone always waits for a person.' : earned() ? 'Proposed rule: where at least 5 predictions have all held, a low-risk fix starts at 10% of conversations and you are told afterwards. One miss returns the area to full review. Today every fix waits for approval.' : 'The record does not change how a fix is reviewed yet. Every fix gets full review.'}</p>`)}
    ${dayOne}
    ${!vars() ? '' : row('fit', 'Does Autopilot fit its fixes to the sims it can see?', 'For 20 fixes, Autopilot saw a random half of the sims. The other half was held back.', '<span class="chip blue">Experiment</span>', `<div style="padding:14px 16px"><div class="grid3"><div><div class="label">Pass rate on sims it saw</div><div class="stat">93%</div></div><div><div class="label">Pass rate on sims held back</div><div class="stat">90%</div></div><div><div class="label">Gap</div><div class="stat">3 points</div></div></div>
      <p class="note">Too small a sample to act on. If the gap grows, approval moves to held-back sims only.</p></div>`)}
  </div></div>`;
}

// ---------- Modals ----------
function commands() {
  const c = [...(unseen() ? [['Go to Overview', 'G O', () => go('#/overview')]] : []), ['Go to Fixes', 'G F', () => go('#/fixes')], ...(vars() ? [['Go to Test sets', 'G T', () => go('#/sets')]] : []), ['Go to Sim accuracy', 'G A', () => go('#/health')],
    ['Open fix 214: Refunds on multi-parcel orders', 'Fix', () => go('#/fix/214')]];
  if (canApprove()) c.push(['Approve fix 214', 'A', () => act('approve')]);
  if (!S.approved && !S.running && !S.kept && isPm()) c.push(['Send fix 214 back to Autopilot', '', () => open('sendback')]);
  c.push(['What changes in fix 214', '', () => go('#/fix/214/change')], ['How fix 214 was tested', '', () => go('#/fix/214/tested')],
    ['Share a summary of fix 214', '', () => open('share')], ['Keyboard shortcuts', '?', () => open('keys')], ['Who decides what', '', () => open('who')],
    [`View as the ${isPm() ? 'customer reviewer' : 'Agent PM'}`, '', () => go('#/as/' + (isPm() ? 'customer' : 'pm'))]);
  RUNGS.forEach((r, i) => c.push([`Prototype rung ${r.label || r.id}: ${r.name}`, S.rung === i ? 'On' : '', () => { setRung(r.id); go(here()); }]));
  if (unseen()) areas().forEach(a => c.push([`Area: ${a.name}`, '', () => go('#/area/' + a.slug)]));
  sims().forEach(s => c.push([`${s.id}: ${s.title}`, statusOf(s)[1], () => go('#/sim/' + s.id), `${s.area} ${s.scenario.customer}`]));
  return c;
}
const cmdMatch = q => commands().filter(c => `${c[0]} ${c[3] || ''}`.toLowerCase().includes(q.toLowerCase()));
function cmdList(q) {
  const items = cmdMatch(q);
  S.cmdSel = Math.max(0, Math.min(S.cmdSel, items.length - 1));
  return items.length ? items.map((c, i) => `<div class="item ${i === S.cmdSel ? 'sel' : ''}" data-cmd="${esc(c[0])}">${esc(c[0])}<span>${c[1]}</span></div>`).join('') : '<div class="empty">Nothing matches. Try a fix number, an area, or a sim such as S-12.</div>';
}
function modal() {
  if (!S.modal) return '';
  let inner = '', cls = '';
  if (S.modal === 'cmd') { cls = 'cmd'; inner = `<input id="cmdq" placeholder="Search fixes and sims, or type a command" autocomplete="off" aria-label="Search"><div class="list" id="cmdlist">${cmdList('')}</div>`; }
  if (S.modal === 'keys') inner = `<h2>Keyboard shortcuts</h2><div class="keys">
    <span>Search or jump to anything</span><span><kbd>&#8984;</kbd> <kbd>K</kbd></span><span>Move down or up a list</span><span><kbd>J</kbd> <kbd>K</kbd></span><span>Open the selected row</span><span><kbd>Enter</kbd></span>
    <span>Next or previous sim, with a sim open</span><span><kbd>J</kbd> <kbd>K</kbd></span><span>Close, or go back</span><span><kbd>Esc</kbd></span>
    <span>Go to ${unseen() ? 'Overview, ' : ''}Fixes, ${vars() ? 'Test sets, ' : ''}Sim accuracy</span><span><kbd>G</kbd> then ${unseen() ? '<kbd>O</kbd> ' : ''}<kbd>F</kbd> ${vars() ? '<kbd>T</kbd> ' : ''}<kbd>A</kbd></span><span>Approve the open fix</span><span><kbd>A</kbd></span><span>Undo an approval, for 10 seconds</span><span><kbd>Z</kbd></span></div>
    <div class="actions"><button class="btn" data-act="close">Close</button></div>`;
  if (S.modal === 'sendback') inner = S.version === 1 ? `<h2>Send back to Autopilot</h2>
    <p>Autopilot revises the fix and tests it again. The sim that failed goes with it: S-12, the gift card order, where a payments rule was broken.</p>
    <textarea id="note" aria-label="Instruction">Orders paid partly by gift card should keep going to a specialist for now. Do not try to split the refund.</textarea>
    <div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="doSendback">Send back and test again</button></div>` : `<h2>Send back to Autopilot</h2>
    <p>Autopilot revises the fix and tests it again. Nothing got worse in version 2, so no sim is attached. Say what should change.</p>
    <textarea id="note" placeholder="What should change in version 3?" aria-label="Instruction"></textarea>
    <div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="doSendback2">Send back and test again</button></div>`;
  if (S.modal === 'who') { cls = 'wide'; const y = t => `<td>${mk('ok', 1)} ${t || 'Yes'}</td>`, n = t => `<td class="muted">${t}</td>`;
    inner = `<h2>Who decides what</h2><p>Sam Okafor is the Agent PM. Maria Chen reviews for Ridgeline. Both open the same page and see the same result, sims, conversations and tool calls. Each decides what they own.</p>
    <table class="tbl who"><thead><tr><th></th><th>Agent PM</th><th>Customer reviewer</th></tr></thead><tbody>
      <tr><td>See the result and everything behind it</td>${y()}${y()}</tr>
      <tr><td>Answer a question about Ridgeline's policy</td>${y(unseen() ? 'Only for the rules Ridgeline has handed over. For Sam: escalation and critical flows.' : '')}${y()}</tr>
      ${unseen() ? `<tr><td>Change a rule that must always work</td>${n('Only its named owner')}${n('Only its named owner')}</tr>` : ''}
      ${vars() ? `<tr><td>Dispute a sim</td>${y('Yes. It goes to the owner.')}${y('Yes. It goes to the owner.')}</tr>` : ''}
      <tr><td>Send the fix back to Autopilot</td>${y()}${n('No. Asks the Agent PM.')}</tr>
      <tr><td>Approve the fix</td>${y('Yes. Ridgeline is told.')}${y('Yes. The Agent PM is told.')}</tr>
    </tbody></table>
    <p class="note">One approval is enough. Every answer and approval is recorded under the name of the person who gave it.${auto() ? ' A low-risk fix in an area where at least 5 predictions have all held starts on its own, and both reviewers are told. Autopilot never changes a rule that must always work.' : ''}</p>
    <div class="actions"><button class="btn" data-act="close">Close</button></div>`; }
  if (S.modal === 'dispute') { const s = simById(S.dsim); if (s) { const e = disputeEffect(s, S.dcp);
    inner = `<h2>Dispute what this sim expects</h2><p>${s.id}, ${esc(s.title)}. Choose the checkpoint you think is wrong and say what it should expect.</p>
    <div class="pick">${s.checks.map(([cid, b, a]) => `<label><input type="radio" name="dcp" value="${cid}" ${cid === S.dcp ? 'checked' : ''}><span>${esc(CP[cid].text)}<span class="d">From ${esc(CP[cid].src)} · with the fix: ${a === 'pass' ? 'pass' : a === 'fail' ? 'fail' : a === 'unk' ? 'undecided' : 'not reached'}</span></span></label>`).join('')}</div>
    <textarea id="note" aria-label="What it should expect" placeholder="What should it expect instead, and why?">${esc(S.dnote || '')}</textarea>
    <dl class="kv" id="dwhat"><dt>Sent to</dt><dd>${esc(e.to)}</dd><dt>The fix</dt><dd>${e.fix}</dd><dt>Next</dt><dd>${e.then}</dd></dl>
    <div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="doDispute">Send to the owner</button></div>`; } }
  if (S.modal === 'share') {
    const v1 = S.version === 1;
    inner = `<h2>Summary for Ridgeline Outdoor</h2><p>A plain-language version for the customer's support lead. The link opens the same evidence you see.</p>
    <div class="letter"><p><b>Proposed change: refund multi-parcel orders without a handoff</b></p>
      <p>Customers returning one item from an order that shipped in several parcels are almost always passed to a specialist. That was 212 conversations last month.</p>
      <p><b>What we tested</b></p><ul><li>9 of your real conversations where this happened, replayed as simulations${vars() ? `, and ${made() - 9} more written from them${unseen() ? ' and from the new steps' : ''}` : ''}.</li><li>${vars() ? `${N.existing} more covering other refunds, cancellations, exchanges and order status${unseen() ? `, and the ${N.found} things you have said must always work` : ''}` : `${RECENT} recent conversations that the change should not affect, simulated in the same way`}.</li></ul>
      <p><b>What we found</b></p><ul>${v1 ? `<li>Today all 9 real conversations are passed to a specialist. With the change, 8 are resolved without one.</li><li>1 is not safe yet. On an order paid partly by gift card, the refund went to the wrong payment method. The change will be revised and tested again before it goes any further.</li>` : `<li>Today all 9 real conversations are passed to a specialist. With the change, 8 are resolved without one.${vars() ? ` The ${made() - 9} written cases pass too.` : ''}</li><li>The 9th, an order paid partly by gift card, still goes to a specialist, on purpose.</li><li>${unseen() ? 'Nothing that must always work broke.' : 'No rule was broken.'}</li>`}</ul>
      <p><b>What we did not test</b></p><ul>${!unseen() || S.gap || v1 ? '' : '<li>A multi-parcel item returned after 30 days. This change affects it, and no simulation covers it yet.</li>'}${unseen() ? '<li>International returns. This change does not affect them.</li>' : '<li>Any situation that is not in your past conversations.</li>'}</ul>
      <p><b>What happens next</b></p><ul><li>${v1 ? 'A revised change will be tested and shared.' : S.pending ? 'It is approved and is starting on 10% of refund conversations. We report real results on 17 Nov.' : S.approved ? 'It is now live for 10% of refund conversations. We report real results on 17 Nov.' : 'With your approval it starts on 10% of refund conversations, and we report real results on 17 Nov.'}</li></ul></div>
    <div class="actions"><button class="btn" data-act="close">Close</button><button class="btn primary" data-act="copied">Copy link</button></div>`;
  }
  return `<div class="modal-bg" data-act="bgclose"><div class="modal ${cls}" role="dialog" aria-modal="true">${inner}</div></div>`;
}

// ---------- Router ----------
function render() {
  const ph = location.hash.match(/^#\/phase\/(1|2|3|north)(\/new)?(?:\/(.*))?$/);
  if (ph) { setRung(ph[1]); S.showNew = !!ph[2]; store(); S.modal = null; return location.replace('#/' + (ph[3] || 'fix/214')); }
  if (location.hash.startsWith('#/as/')) { S.role = location.hash.includes('customer') ? 'cust' : 'pm'; S.modal = null; return go('#/fix/214'); }
  if (here() !== location.hash) return location.replace(here());
  const p = parse();
  // A side panel slides out before the page under it is drawn again.
  const leaving = $('.panel');
  if (leaving && !p.panel && S.lastPanel && p.base === S.last && !S.modal && !still()) {
    if (S.leaving) return;
    S.leaving = true; leaving.classList.add('out'); const sc = $('.scrim'); if (sc) sc.classList.add('out');
    return setTimeout(() => { S.leaving = false; S.lastPanel = null; render(); }, 130);
  }
  const enter = p.base !== S.last;
  if (enter) { S.kf = -1; window.scrollTo(0, 0); }
  const old = $('.panel-b'), key = old && old.dataset.key, top = old ? old.scrollTop : 0;
  if (p.panel === 'sim') S.reviewed[p.id] = true;
  const body = p.base === 'fix' ? fixPage(p) : p.base === 'sets' ? setsPage(p) : p.base === 'health' ? healthPage() : p.base === 'fixes' ? inbox() : p.base === 'area' ? areaPage(p.id) : overview();
  $('#root').innerHTML = shell(p, body, enter);
  const now = $('.panel-b');
  if (now && now.dataset.key === key) now.scrollTop = top;
  const opened = now && S.lastPanel === null;
  S.last = p.base; S.lastPanel = p.panel || null; S.pop = false; S.renderedAt = Date.now();
  markRow(); settle();
  const q = $('#cmdq'); if (q) q.focus();
  const n = $('#note'); if (n) n.focus();
  if (S.modal && !q && !n) { const b = $('.modal .btn.primary') || $('.modal .btn'); if (b) b.focus(); }
  else if (opened && !S.modal) $('.panel').focus({preventScroll: true});
}
// A screen that the current rung does not have yet falls back to the nearest one it has.
function here() {
  const h = location.hash || '#/overview', r = h.slice(2);
  if (/^(overview|area)/.test(r) && !unseen()) return '#/fixes';
  if (r.startsWith('sets') && !vars()) return '#/fixes';
  if (/^sets\/./.test(r) && !unseen()) return '#/sets';
  if (r.startsWith('sim/') && !simById(r.slice(4)) && ['S-08', 'S-10', 'S-11', 'S-13', 'P-03', 'C-07', 'X-04', 'R-22'].includes(r.slice(4))) return '#/fix/214';
  if (r === 'fix/214/tested' || r === 'fix/214/change' || r.startsWith('fix') || r.startsWith('sim/') || r.startsWith('fixes') || /^(overview|area|sets|health)/.test(r)) return h;
  return unseen() ? h : '#/fixes';
}
function go(hash) { S.modal = null; if (location.hash === hash) render(); else location.hash = hash; }
function open(m) { S.modal = m; S.cmdSel = 0; render(); }
const rowsNow = () => $$('.page .click');
function markRow() { rowsNow().forEach((r, i) => r.classList.toggle('kf', i === S.kf)); }
function stepSim(d) {
  const p = parse(); if (p.panel !== 'sim') return false;
  const order = simOrder(), i = order.findIndex(s => s.id === p.id), next = order[i + d];
  if (i < 0 || !next) return true;
  S.filter = simGroups().look.some(x => x.id === next.id) ? 'look' : next.status === 'fixed' ? 'fixed' : 'skip';
  go('#/sim/' + next.id); return true;
}

function finishRun() {
  clearInterval(S.timer); S.timer = null;
  S.running = false; S.version = 2; S.sandbox = true; S.filter = 'look'; S.pop = true; render();
  buzz(10); toast('Version 2 tested. The payments problem is gone.');
}
function startRun() {
  S.modal = null; S.running = true; S.stage = 0; go('#/fix/214');
  S.timer = setInterval(() => {
    S.stage++;
    if (S.stage < stages().length) { const el = $('#stages'); if (el) { el.innerHTML = stagesHtml(); $('#runstep').textContent = runStep(); $('#runbar').style.width = runPct() + '%'; } return; }
    finishRun();
  }, 560);
}

function act(a, el) {
  if (a === 'close' || a === 'bgclose') { S.modal = null; return render(); }
  if (a === 'closePanel') return go('#/fix/214');
  if (a === 'cmd' || a === 'keys' || a === 'share' || a === 'who') return open(a);
  if (a === 'phase') { setRung(el.dataset.v); S.kf = -1; return go(here()); }
  if (a === 'showNew') { S.showNew = !S.showNew; store(); return render(); }
  if (a === 'askPm') return toast('Sent to Sam Okafor, with a link to this fix.');
  if (a === 'gap') { if (S.version !== 2 || S.approved) return; S.gap = el.dataset.v; S.pop = true; buzz(10); render(); return toast(S.gap === 'decline' ? 'S-13 built from your answer. It passes with the fix.' : 'S-13 built from your answer. It fails with the fix.'); }
  if (a === 'gapUndo') { if (S.approved) return; S.gap = null; if (parse().id === 'S-13') return go('#/fix/214'); return render(); }
  if (a === 'unkeep') { if (!isPm()) return; S.kept = false; S.pop = true; return render(); }
  if (a === 'dispute') { const p = parse(), s = simById(p.id); if (!s) return; const f = s.checks.find(r => r[2] === 'fail'); S.dsim = s.id; S.dcp = (f || s.checks[0])[0]; S.dnote = ''; return open('dispute'); }
  if (a === 'doDispute') { const n = $('#note'), note = (n && n.value.trim()) || 'No note given.'; S.dispute[S.dsim] = {cid: S.dcp, note}; S.modal = null; render(); const c = CP[S.dcp]; return toast(ownsCp(c) ? 'Dispute recorded. The question is on your list.' : `Dispute sent to ${cpOwner(c).split(',')[0]}. The result stands until it is answered.`); }
  if (a === 'undispute') { delete S.dispute[parse().id]; render(); return toast('Dispute withdrawn.'); }
  if (a === 'toggle') { const id = el.dataset.id; S.open[id] = !isOpen(id); S.fresh = S.open[id] ? id : null; S.kf = -1; return render(); }
  if (a === 'showSkipped') { S.open.sims = true; S.filter = 'skip'; render(); const t = $('#sims'); if (t) t.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  if (a === 'openAreas') { S.open.areas = true; return go('#/health'); }
  if (a === 'prevSim') return stepSim(-1);
  if (a === 'nextSim') return stepSim(1);
  if (a === 'sendback') { if (!S.running && !S.approved && !S.kept && isPm()) open('sendback'); return; }
  if (a === 'approve') {
    if (!canApprove()) return;
    S.modal = null; S.approved = true; S.pending = true; S.pop = true; go('#/fix/214'); window.scrollTo(0, 0);
    clearTimeout(S.undoTimer);
    S.undoTimer = setTimeout(() => { S.pending = false; if (S.modal !== 'cmd' && S.modal !== 'sendback') render(); }, 10000);
    buzz([12, 50, 18]); return toast('Approved. It starts in 10 seconds.', 'undoApprove', 10000);
  }
  if (a === 'undoApprove') {
    if (!S.pending) return;
    clearTimeout(S.undoTimer); S.approved = false; S.pending = false; render();
    buzz(8); return toast('Approval undone. Nothing went live.');
  }
  if (a === 'copied') {
    const url = location.href.split('#')[0] + `#/phase/${RUNG().id}/fix/214`;
    S.modal = null; render();
    const done = ok => toast(ok ? 'Link copied.' : 'Your browser blocked copying. The link is ' + url, null, 8000);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => done(true), () => done(false)); else done(false);
    return;
  }
  if (a === 'doSendback') { if (S.version === 1 && !S.running && isPm()) startRun(); return; }
  if (a === 'skipRun') { if (S.running) finishRun(); return; }
  if (a === 'doSendback2') { S.modal = null; render(); return toast('A second round of revision is not built in this prototype.'); }
  if (a === 'acceptEdit') { if (S.version !== 2 || S.simEdit || S.kept || !isPm()) return; S.simEdit = true; S.pop = true; buzz(10); render(); return toast('Sim updated. Recorded under your name.'); }
  if (a === 'refuseEdit') { if (S.version !== 2 || S.simEdit || S.kept || !isPm()) return; S.kept = true; S.pop = true; buzz(10); render(); return toast('Sim kept. The fix is closed, and Autopilot has been told.'); }

  if (a === 'd4') { S.d4 = el.dataset.v; S.open['d:D-4'] = true; S.open.price = true; buzz(10); render(); return toast('Your answer is now what the sim expects. The sim is in use.'); }
}

document.addEventListener('click', e => {
  const cmd = e.target.closest('[data-cmd]');
  if (cmd) { const c = commands().find(x => x[0] === cmd.dataset.cmd); S.modal = null; render(); if (c) c[2](); return; }
  const el = e.target.closest('[data-act],[data-go],[data-filter],[data-cp-row],[data-stub]');
  if (!el) return;
  if (el.dataset.act === 'bgclose' && e.target !== el) return;
  if (e.detail > 1 && Date.now() - S.renderedAt < 500) { if (el.tagName === 'A') e.preventDefault(); return; }
  if (el.tagName === 'A' && el.dataset.act && el.getAttribute('href') === '#') e.preventDefault();
  const inner = e.target.closest('a,button');
  if (inner && inner !== el && el.contains(inner)) { if (inner.dataset.act) act(inner.dataset.act, inner); return; }
  if (el.dataset.filter) { S.filter = el.dataset.filter; S.kf = -1; return render(); }
  if (el.dataset.cpRow) {
    $$('.cp.flash').forEach(n => n.classList.remove('flash')); $$('tr.hl').forEach(n => n.classList.remove('hl'));
    el.classList.add('hl');
    const hits = $$(`.cp[data-cp="${el.dataset.cpRow}"]`);
    hits.forEach(n => n.classList.add('flash'));
    if (hits[0]) hits[0].scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'}); else toast('This one is checked on the final account state, shown under "How it ended".');
    return;
  }
  if (el.dataset.go) return go(el.dataset.go);
  if (el.dataset.stub) return toast(`Fix ${el.dataset.stub} cannot be opened in this prototype. Fix 214, refunds on multi-parcel orders, is the one built in full.`);
  if (el.dataset.act === 'openAreas') e.preventDefault();
  act(el.dataset.act, el);
});

document.addEventListener('change', e => {
  if (e.target.name === 'dcp') { const n = $('#note'); S.dnote = n ? n.value : ''; S.dcp = e.target.value; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'cmdq') { S.cmdSel = 0; $('#cmdlist').innerHTML = cmdList(e.target.value); }
});

let chord = 0;
document.addEventListener('keydown', e => {
  const k = e.key, ae = document.activeElement, typing = /^(INPUT|TEXTAREA)$/.test(ae.tagName);
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'k') { e.preventDefault(); return S.modal === 'cmd' ? act('close') : open('cmd'); }
  if (S.modal === 'cmd') {
    const q = $('#cmdq').value, items = cmdMatch(q);
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); S.cmdSel = (S.cmdSel + (k === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length); $('#cmdlist').innerHTML = cmdList(q); const s = $('.cmd .sel'); if (s) s.scrollIntoView({block: 'nearest'}); return; }
    if (k === 'Enter') { e.preventDefault(); const c = items[S.cmdSel]; S.modal = null; render(); if (c) c[2](); return; }
  }
  if (k === 'Escape') {
    if (S.modal) return act('close');
    const p = parse();
    if (p.panel) return go('#/fix/214');
    if (p.base === 'fix') return go('#/fixes');
    if (p.base === 'area') return go('#/overview');
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (k === 'z' && S.pending) return act('undoApprove');
  if (S.modal) return;
  if ((k === 'Enter' || k === ' ') && (ae.tagName === 'TR' || ae.getAttribute('role') === 'button')) { e.preventDefault(); return ae.click(); }
  if (k === '?') return open('keys');
  if (chord && Date.now() - chord < 900) {
    chord = 0;
    if (k === 'o') return unseen() ? go('#/overview') : undefined; if (k === 'f') return go('#/fixes'); if (k === 't') return vars() ? go('#/sets') : undefined; if (k === 'a') return go('#/health');
  }
  if (k === 'g') { chord = Date.now(); return; }
  if (k === 'j' || k === 'k') {
    if (stepSim(k === 'j' ? 1 : -1)) return;
    const rows = rowsNow(); if (!rows.length) return;
    S.kf = Math.max(0, Math.min(rows.length - 1, S.kf + (k === 'j' ? 1 : -1)));
    markRow(); rows[S.kf].scrollIntoView({block: 'nearest'}); return;
  }
  if (k === 'Enter' && S.kf >= 0) { const r = rowsNow()[S.kf]; if (r) r.click(); return; }
  if (k === 'a' && parse().base === 'fix') return act('approve');
});
window.addEventListener('hashchange', () => { S.modal = null; render(); });
render();
