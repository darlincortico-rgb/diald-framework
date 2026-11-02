/* DIALD side menu: a drawer that opens from the left edge with Back / Forward buttons,
   "You are here", and the whole site map (Library lessons by grade band → profile → stage,
   activity categories, the DIALD cycle, and the state rules). Signed-in pages only. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = window.DIALDLibrary || {}, E = window.DIALDEngine || {}, S = window.DIALDStates || { STATES: [] };
  const Q = ['Q1', 'Q2', 'Q3', 'Q4'];
  const qName = q => (E.QUADRANTS && E.QUADRANTS[q] ? E.QUADRANTS[q].name : q);
  const CYCLE = ['Profile', 'Pattern Indicator', 'Instructional Focus', 'Response', 'Adaptation'];

  const link = (href, text, cls = '') => `<a href="${href}" class="${cls}">${esc(text)}</a>`;
  const group = (label, href, inner, key) => `<details data-k="${key}"><summary>${href ? link(href, label) : esc(label)}</summary><div class="sn-in">${inner}</div></details>`;

  function tree() {
    const bands = (L.GRADES || []).map(g => group((L.BANDS && L.BANDS[g] ? L.BANDS[g].name : g), '#/library/lessons/' + g,
      Q.map(q => group(q + ' · ' + qName(q), `#/library/lessons/${g}/${q}`,
        (L.STAGES || []).map(s => link(`#/library/lessons/${g}/${q}/${s.n}`, s.name)).join(''), `l-${g}-${q}`)).join(''), 'l-' + g)).join('');
    const cats = Object.entries(L.CATEGORIES || {}).map(([k, c]) => link('#/library/activities/' + k, c.name)).join('');
    return `
      ${link('#/', 'Dashboard')}
      ${link('#/analyze', 'Learner Trajectory')}
      ${group('Library', '#/library', `
        ${group('Lessons', '#/library/lessons', bands, 'lessons')}
        ${group('Activities', '#/library/activities', cats, 'acts')}
        ${link('#/library/stages', 'The four intervention stages')}
        ${link('#/library/push-in', 'Push-in strategies')}
        ${link('#/library/iep', 'Students with IEPs or 504 plans')}`, 'lib')}
      ${group('DIALD Cycle', '#/framework', CYCLE.map((t, i) => link('#/framework?stage=' + (i + 1), (i + 1) + ' · ' + t)).join(''), 'cycle')}
      ${link('#/states', 'State rules')}
      ${link('#/plans', 'My plans')}
      ${link('#/help', 'Help')}`;
  }

  // "You are here": a readable trail for the current address.
  function trail() {
    const h = location.hash.replace(/^#\/?/, ''), [path, qs] = h.split('?'), p = path.split('/').filter(Boolean);
    const out = [];
    const names = { '': 'Dashboard', analyze: 'Learner Trajectory', learner: 'Learner Trajectory', class: 'My class', plans: 'My plans', plan: 'Plan', help: 'Help', states: 'State rules', profile: 'Profile', framework: 'DIALD Cycle', library: 'Library', activity: 'Library' };
    out.push(names[p[0] || ''] || 'DIALD');
    if (p[0] === 'library') {
      if (p[1] === 'lessons') { out.push('Lessons'); if (p[2] && L.BANDS && L.BANDS[p[2]]) out.push(L.BANDS[p[2]].name); if (p[3]) out.push(p[3] + ' · ' + qName(p[3])); if (p[4]) { const s = (L.STAGES || []).find(x => String(x.n) === p[4]); out.push(s ? s.name : 'Stage ' + p[4]); } }
      else if (p[1] === 'activities') { out.push('Activities'); if (p[2] && L.CATEGORIES && L.CATEGORIES[p[2]]) out.push(L.CATEGORIES[p[2]].name); }
      else if (p[1] === 'stages') out.push('Intervention stages');
      else if (p[1] === 'push-in') out.push('Push-in strategies');
      else if (p[1] === 'iep') out.push('IEPs or 504 plans');
    } else if (p[0] === 'activity') {
      out.push('Activities'); const a = (L.activities || []).find(x => x.id === p[1]); if (a) out.push(a.name);
    } else if (p[0] === 'framework') {
      const st = Number(new URLSearchParams(qs || '').get('stage')); if (st >= 1 && st <= 5) out.push(CYCLE[st - 1]);
    }
    return out;
  }

  function mount() {
    if (document.getElementById('sn')) return;
    const box = document.createElement('div');
    box.id = 'sn';
    box.innerHTML = `
      <button class="sn-tab" id="sn-tab" type="button" aria-expanded="false" aria-controls="sn-panel" title="Menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Menu</span></button>
      <div class="sn-shade" id="sn-shade"></div>
      <aside class="sn-panel" id="sn-panel" aria-label="Site menu" hidden>
        <div class="sn-head"><b>Menu</b><button type="button" class="sn-x" id="sn-x" aria-label="Close the menu">×</button></div>
        <div class="sn-nav">
          <button type="button" class="btn" id="sn-back">← Back</button>
          <button type="button" class="btn" id="sn-fwd">Forward →</button>
        </div>
        <div class="sn-here"><small>You are here</small><p id="sn-trail"></p></div>
        <nav class="sn-tree" id="sn-tree"></nav>
      </aside>`;
    document.body.appendChild(box);
    const $ = s => box.querySelector(s);
    const panel = $('#sn-panel'), tab = $('#sn-tab');
    const set = open => {
      if (open) { draw(); panel.hidden = false; requestAnimationFrame(() => box.classList.add('open')); }
      else { box.classList.remove('open'); setTimeout(() => { if (!box.classList.contains('open')) panel.hidden = true; }, 280); }
      tab.setAttribute('aria-expanded', String(open));
    };
    const draw = () => {
      $('#sn-trail').innerHTML = trail().map(esc).join(' <span aria-hidden="true">›</span> ');
      const t = $('#sn-tree'); t.innerHTML = tree();
      const here = location.hash || '#/';
      const best = [...t.querySelectorAll('a')].filter(a => a.getAttribute('href') === here)[0]
        || [...t.querySelectorAll('a')].filter(a => here.startsWith(a.getAttribute('href').split('?')[0]) && a.getAttribute('href') !== '#/').sort((a, b) => b.getAttribute('href').length - a.getAttribute('href').length)[0];
      if (best) { best.classList.add('here'); let d = best.closest('details'); while (d) { d.open = true; d = d.parentElement.closest('details'); } }
      // Opening the trail at the summary link opens its group too.
      t.querySelectorAll('summary a').forEach(a => a.addEventListener('click', () => set(false)));
      t.querySelectorAll('.sn-in a, .sn-tree > a').forEach(a => a.addEventListener('click', () => set(false)));
    };
    tab.onclick = () => set(panel.hidden);
    $('#sn-x').onclick = () => set(false);
    $('#sn-shade').onclick = () => set(false);
    $('#sn-back').onclick = () => history.back();
    $('#sn-fwd').onclick = () => history.forward();
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) set(false); });
    window.addEventListener('hashchange', () => { if (!panel.hidden) draw(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
