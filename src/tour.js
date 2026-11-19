// ---------- Guided tour ----------
// Optional and non-blocking: a card that walks fix 214 from proposal to release, then the four rungs.
// Start it from ?tour=1, #tour, or "Guided tour" in the side navigation.
const T = {i: -1, scrolled: false, invite: false};
const tourEl = s => () => $(s);
const askWith = a => () => { const b = $(`[data-act="${a}"]`); return b && b.closest('.ask'); };
function resetFix() {
  $$('.toast').forEach(t => t.remove());
  clearInterval(S.timer); clearTimeout(S.undoTimer);
  Object.assign(S, {kept: false, gap: null, dispute: {}, version: 1, running: false, stage: 0, timer: null, simEdit: false, sandbox: false, approved: false, pending: false, filter: 'look', kf: -1, open: {price: true}});
}
function story() { S.role = 'pm'; setRung('north'); S.showNew = false; store(); }
function atV1() { story(); if (S.version !== 1 || S.running || S.approved) resetFix(); }
function atV2() {
  story(); S.kept = false; if (S.gap === 'handoff') S.gap = null;
  if (S.approved) { clearTimeout(S.undoTimer); S.approved = false; S.pending = false; }
  if (S.version === 1) finishRun();
}
function atAnswered() { atV2(); if (!S.simEdit) act('acceptEdit'); }
function atLive() { atAnswered(); if (!S.approved) act('approve'); }
const atRung = id => () => { if (S.approved) $$('.toast').forEach(t => t.remove()); S.role = 'pm'; setRung(id); S.showNew = true; store(); };

const TOUR = [
  {go: '#/fixes', at: story, el: tourEl('.page .q-row[href="#/fix/214"]'), t: 'One fix, from proposal to release',
    b: 'This is the Agent PM\'s fixes inbox at Ridgeline, a fictional retailer. Autopilot reads real conversations, finds where the agent fails, proposes a fix and tests it before anyone looks. The tour follows one fix: refunds on multi-parcel orders, handed to a human 94% of the time.'},
  {go: '#/fix/214', at: atV1, el: () => { const h = $('.page h1'); return h && h.parentElement; }, t: 'Autopilot proposes the change',
    b: 'Refund the returned item without a handoff, once it has been delivered and received back. It is high risk because it moves money. <a class="link" href="#/fix/214/change">See the exact change</a>'},
  {go: '#/fix/214/tested', at: atV1, el: tourEl('.panel'), t: 'The reviewer writes no simulations',
    b: () => `The system picked and built all ${N.all} sims for this fix: the 9 real conversations behind the issue, recent conversations the fix should not touch, and sims that must always work. Each runs on the current agent and on the changed one.`},
  {go: '#/fix/214', at: atV1, el: () => [$('#ready .top'), $('#ready .pips') && $('#ready .pips').closest('.cmp')], t: '8 of 9 fixed. The ninth refunds the wrong card.',
    b: 'The fix resolves 8 of the 9 real conversations. In the ninth, Omar H. paid $50.00 by gift card and the rest by Visa, and the whole $84.00 refund goes to Visa. A pass rate of 8 of 9 looks good. A broken payments rule stops the fix anyway, so approval is off.'},
  {go: '#/sim/S-12', at: atV1, el: tourEl('.panel'), t: 'The evidence is one click away',
    b: 'Every mark opens the conversation it stands for, replayed on both versions, with each checkpoint the sim scored. Refund amounts and tool calls are checked by code, not by an AI judge.'},
  {go: '#/fix/214', at: atV1, el: askWith('doSendback'), t: 'Decision 1 of 2: send it back',
    b: 'The reviewer only says what the agent should do: orders paid partly by gift card keep going to a specialist. Autopilot revises the fix and tests it again. Select <b>Next</b>, or the button yourself.'},
  {go: '#/fix/214', at: atV2, el: askWith('acceptEdit'), t: 'Decision 2 of 2: a sim that must always work disagrees',
    b: 'Version 2 fixes the 8 and keeps gift-card orders with a specialist. One sim that must always work still expects every multi-parcel refund to go to a human. Removing that handoff is the point of the fix, so a person decides which is right. Select <b>Next</b> to update the sim.'},
  {go: '#/fix/214', at: atAnswered, el: tourEl('#ready > .foot'), t: 'Approve, with a prediction',
    b: 'Approval starts the fix on 10% of refund conversations. It carries a prediction: handoffs on multi-parcel refunds fall from 94% to about 15%. Select <b>Next</b> to approve. There are 10 seconds to undo.'},
  {go: '#/fix/214', at: atLive, el: tourEl('#ready .top'), t: 'Checked against real conversations a week later',
    b: 'The prediction goes out with the release. On 17 Nov it is checked against real conversations, and the result is added to Sim accuracy.'},
  {go: '#/health', at: atLive, el: () => { const d = [...$$('.page .d')].find(x => x.textContent === 'Fix 214'); return d && d.closest('table'); }, t: 'The record says when to trust the sims',
    b: 'Sim accuracy sets each prediction next to what real conversations did. Fix 214 waits here until it is checked. Where the sims have been right, review gets lighter. Where they missed, it stays full.'},
  {go: '#/fix/214', at: atRung('1'), el: tourEl('.phase'), t: 'Built in four rungs. Rung 1: simulations of real conversations',
    b: 'Each rung adds one kind of simulation. Switch rungs here at any time. Purple tags mark what is new. Rung 1 replays the conversations behind the issue and recent ones the fix should not touch, with an AI playing the real customer. Not yet: any written simulation.'},
  {go: '#/fix/214', at: atRung('2'), el: tourEl('.phase'), t: 'Rung 2: simulations of variations',
    b: 'Variations on real conversations, each naming the conversation it came from and the detail that was changed, and test sets refreshed from recent conversations. Not yet: situations no customer has raised.'},
  {go: '#/fix/214', at: atRung('3'), el: tourEl('.phase'), t: 'Rung 3: simulations of situations not yet seen',
    b: 'Sims with no conversation behind them, coverage across the agent, and a set that must always work. This is where the second decision comes from. Not yet: review that varies by area.'},
  {go: '#/fix/214', at: atRung('north'), el: () => $('#why-person') || $('.phase'), t: 'North star: the record sets the review',
    b: 'Low-risk fixes start on their own where the sims have been right. Fix 214 still waits for a person, because it moves money.'},
  {go: '#/fixes', at: () => { story(); resetFix(); }, el: tourEl('.nav .tour-nav'), t: 'Now explore on your own',
    b: 'Everything is clickable, and the fix is back at the start. Restart the tour from <b>Guided tour</b>, or share the link with <b>#tour</b> at the end.'},
];

function tourCard() {
  let c = $('#tour');
  if (!c) { c = document.createElement('div'); c.id = 'tour'; c.className = 'tour'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-live', 'polite'); document.body.appendChild(c); }
  return c;
}
function tourMark() {
  $$('.tour-hl').forEach(e => e.classList.remove('tour-hl'));
  const s = TOUR[T.i]; if (!s) return;
  const els = [].concat(s.el()).filter(Boolean);
  els.forEach(e => e.classList.add('tour-hl'));
  const c = $('#tour'); if (c) c.classList.toggle('left', !!$('.panel') && innerWidth > 900);
  if (els[0] && !T.scrolled) { T.scrolled = true; if (!els[0].closest('.panel, .side') || innerWidth <= 900) els[0].scrollIntoView({block: innerWidth <= 900 || els[0].offsetHeight > innerHeight * .6 ? 'start' : 'center', behavior: 'smooth'}); }
}
function tourShow(i) {
  T.i = Math.max(0, Math.min(TOUR.length - 1, i)); T.scrolled = false; T.invite = false;
  const s = TOUR[T.i], last = T.i === TOUR.length - 1;
  document.body.classList.add('touring');
  s.at();
  tourCard().innerHTML = `<div class="tour-h"><span class="label">Guided tour · ${T.i + 1} of ${TOUR.length}</span><button class="tour-x" data-tour="end" aria-label="End the tour" title="End the tour">&times;</button></div>
    <div class="tour-bar"><i style="width:${100 * (T.i + 1) / TOUR.length}%"></i></div>
    <h3>${s.t}</h3><p>${typeof s.b === 'function' ? s.b() : s.b}</p>
    <div class="tour-f">${T.i ? '<button class="btn" data-tour="back">Back</button>' : '<button class="btn ghost" data-tour="end">Skip</button>'}<span class="tour-k">Use &larr; and &rarr;</span><button class="btn primary" data-tour="${last ? 'end' : 'next'}">${last ? 'Done' : 'Next'}</button></div>`;
  go(s.go); tourMark();
}
function tourEnd(quiet) {
  T.i = -1; T.invite = false; const c = $('#tour'); if (c) c.remove();
  $$('.tour-hl').forEach(e => e.classList.remove('tour-hl')); document.body.classList.remove('touring');
  try { localStorage.setItem('tourSeen', '1'); } catch (e) { /* storage is blocked */ }
  if (!quiet) toast('Tour ended. Restart it from Guided tour.');
}
function tourInvite() {
  T.invite = true;
  tourCard().innerHTML = `<div class="tour-h"><span class="label">Guided tour</span><button class="tour-x" data-tour="later" aria-label="Close" title="Close">&times;</button></div>
    <h3>New here? Take the 3-minute tour</h3><p>It follows one refund fix from proposal to release, then the four rungs. Leave it at any point.</p>
    <div class="tour-f"><button class="btn ghost" data-tour="later">Explore on my own</button><span></span><button class="btn primary" data-tour="start">Start the tour</button></div>`;
}
function tourNav() {
  const n = $('.nav'); if (!n || $('.nav .tour-nav')) return;
  n.insertAdjacentHTML('beforeend', '<a href="#tour" class="tour-nav" data-tour="start"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.8"/><path d="M6.6 5.6l3.6 2.4-3.6 2.4z" stroke-linejoin="round"/></svg>Guided tour</a>');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-tour]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const a = b.dataset.tour;
  if (a === 'start') return tourShow(0);
  if (a === 'next') return tourShow(T.i + 1);
  if (a === 'back') return tourShow(T.i - 1);
  if (a === 'later') return tourEnd(true);
  if (a === 'end') return tourEnd(T.i === TOUR.length - 1);
}, true);
document.addEventListener('keydown', e => {
  if (T.i < 0 || S.modal || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); return T.i < TOUR.length - 1 ? tourShow(T.i + 1) : tourEnd(true); }
  if (e.key === 'ArrowLeft' && T.i > 0) { e.preventDefault(); return tourShow(T.i - 1); }
});
window.addEventListener('hashchange', e => { if (/#\/?tour$/.test(e.newURL)) tourShow(0); });
new MutationObserver(() => { tourNav(); if (T.i >= 0) tourMark(); }).observe($('#root'), {childList: true});
tourNav();
if (TOUR_LINK) { if (location.search) history.replaceState(null, '', location.pathname + location.hash); tourShow(0); }
else { let seen = false; try { seen = !!localStorage.getItem('tourSeen'); } catch (e) { /* storage is blocked */ } if (!seen) tourInvite(); }
