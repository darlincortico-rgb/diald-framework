(function () {
  'use strict';
  const C = window.DIALD_CONFIG, E = window.DIALDEngine, L = window.DIALDLibrary;
  const main = document.getElementById('main');
  const DOMAINS = E.DOMAINS;
  const D1 = { listening: 'L', speaking: 'S', reading: 'R', writing: 'W' };
  const STAGES = ['Profile', 'Pattern Indicator', 'Instructional Focus', 'Response', 'Adaptation'];

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const act = id => L.activities.find(a => a.id === id);
  const pw = id => L.pathways.find(p => p.id === id);
  const $ = sel => main.querySelector(sel);
  const $$ = sel => Array.from(main.querySelectorAll(sel));
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  const quadChip = id => `<span class="chip q">${esc(id)} · ${esc(E.QUADRANTS[id].name)}</span>`;
  const domainChips = ds => ds.map(d => `<span class="chip">${cap(d)}</span>`).join('');
  const statusChip = s => s === 'concern' ? '<span class="chip bad">Concern</span>' : s === 'no-concern' ? '<span class="chip good">No current concern</span>' : s === 'watch' ? '<span class="chip watch">Watch</span>' : '<span class="chip na">Insufficient evidence</span>';
  const sampleChip = x => x.status === 'sample' ? '<span class="chip sample">Sample content</span>' : '';

  /* ---------- Supabase ---------- */
  // The sign-in session lives in sessionStorage, so it ends when the tab or browser closes.
  // Only the short-lived PKCE code verifier stays in localStorage, so links opened from an email
  // (confirm account, reset password) still work in a new tab.
  const authStorage = {
    pick: k => (/code-verifier$/.test(k) ? window.localStorage : window.sessionStorage),
    getItem(k) { try { return this.pick(k).getItem(k); } catch (e) { return null; } },
    setItem(k, v) { try { this.pick(k).setItem(k, v); } catch (e) { /* storage blocked */ } },
    removeItem(k) { try { this.pick(k).removeItem(k); } catch (e) { /* storage blocked */ } }
  };
  let sb = null, user = null, profile = null, profileLoaded = false, googleEnabled = false;
  try {
    if (window.supabase && C.supabaseUrl && C.supabaseKey) {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storage: authStorage } });
    }
  } catch (e) { console.warn('Accounts unavailable', e); }
  const baseUrl = () => location.origin + location.pathname;

  /* ---------- analysis state ---------- */
  const blankPeriod = n => ({ label: 'Year ' + n, listening: null, speaking: null, reading: null, writing: null });
  const blankInputs = () => ({ grade: '', years: '', highLevel: C.defaultHighLevel, periods: [blankPeriod(1), blankPeriod(2)], academic: { status: 'unknown', trend: 'unknown' }, priorResponse: 'none' });
  const SAMPLE = {
    grade: '6-8', years: 5, highLevel: 3,
    periods: [
      { label: 'Year 1', listening: 2, speaking: 1, reading: 1, writing: 1 },
      { label: 'Year 2', listening: 3, speaking: 2, reading: 2, writing: 1 },
      { label: 'Year 3', listening: 3, speaking: 3, reading: 2, writing: 2 },
      { label: 'Year 4', listening: 4, speaking: 3, reading: 2, writing: 2 }
    ],
    academic: { status: 'below', trend: 'improving' }, priorResponse: 'none'
  };
  let A = store.get('diald-analysis') || freshA();
  function freshA() { return { planId: null, planNumber: null, inputs: blankInputs(), stage: 0, selected: [], progress: [], dirty: false }; }
  const result = () => A.ran ? E.analyze(A.inputs) : null;
  function persistA() { store.set('diald-analysis', A); }

  /* ---------- router ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
  }
  function setNav(key) {
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === key));
    document.getElementById('nav').classList.remove('open');
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  }
  function route() {
    // In-page anchors such as the skip link (#main) are not routes.
    if (location.hash && !location.hash.startsWith('#/') && main.innerHTML.trim()) return;
    const { parts, q } = parseHash();
    const p = parts[0] || '';
    // A signed-in teacher completes the profile form before using the workspace.
    if (user && profileLoaded && !profile && !['profile', 'privacy', 'terms', 'reset', 'login', 'help', 'framework'].includes(p)) {
      const here = location.hash.replace(/^#\/?/, '') || 'plans';
      location.hash = '#/profile?next=' + encodeURIComponent(here);
      return;
    }
    if (p === 'home') { location.hash = '#/'; return; }
    document.body.classList.toggle('public', !user);
    // Everything except the landing, account and policy pages needs a free account.
    if (sb && !user && !['', 'login', 'reset', 'privacy', 'terms', 'help', 'framework'].includes(p)) {
      const here = location.hash.replace(/^#\/?/, '');
      location.hash = '#/login?next=' + encodeURIComponent(here);
      return;
    }
    const map = { '': 'home', analyze: 'analyze', learner: 'analyze', class: 'analyze', plan: 'plans', library: 'library', pathway: 'library', activity: 'library', plans: 'plans', help: 'help', framework: 'framework' };
    setNav(map[p] || '');
    if (p === 'profile') profilePage(q);
    else if (p === '') home();
    else if (p === 'analyze') trajectoryHub(q);
    else if (p === 'learner') analyzePage(q);
    else if (p === 'class') classPage();
    else if (p === 'library') { if (!window.DIALDLibUI || !window.DIALDLibUI.render(main, parts.slice(1), q)) notFound(); }
    else if (p === 'framework') window.DIALDLibUI.frameworkPage(main, q, { stageLook: STAGE_LOOK, cycleHTML, bindCycle });
    else if (p === 'pathway') pathwayPage(parts[1]);
    else if (p === 'activity') { if (!window.DIALDLibUI.activityPage(main, parts[1], q)) notFound(); }
    else if (p === 'plans') plansPage();
    else if (p === 'plan') openPlan(parts[1]);
    else if (p === 'login') loginPage(q);
    else if (p === 'reset') resetPage();
    else if (p === 'privacy') privacyPage();
    else if (p === 'terms') termsPage();
    else if (p === 'help' && window.DIALDHelp) window.DIALDHelp.page(main);
    else notFound();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- header account area ---------- */
  function renderAcct() {
    const name = (profile && profile.full_name) || user && (user.email || '') || '';
    const initial = (name.trim()[0] || 'D').toUpperCase();
    const html = user
      ? `<button class="btn ghost find-btn" id="find-btn" type="button" title="Find a student" aria-label="Find a student"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Find a student</span></button><div class="acct-menu"><button class="avatar" id="acct-btn" aria-haspopup="true" aria-expanded="false" title="${esc(name)}">${esc(initial)}</button>
          <div class="acct-pop" id="acct-pop" hidden>
            <div class="acct-who"><span class="avatar big">${esc(initial)}</span><div><b>${esc(name)}</b><small>${esc(user.email || '')}</small></div></div>
            <a href="#/profile">Profile &amp; settings</a><a href="#/plans">My plans</a><button id="replay-tour" type="button">Replay the tour</button><button id="signout" type="button">Sign out</button>
          </div></div>`
      : `<a class="btn" href="#/login">Sign in</a><a class="btn primary" href="#/login?mode=signup">Create account</a>`;
    document.getElementById('acct').innerHTML = html;
    document.getElementById('acct-m').innerHTML = user ? `<a href="#/profile">Profile &amp; settings</a><a href="#" id="signout-m">Sign out</a>` : `<a href="#/login">Sign in</a>`;
    const so = async e => { e.preventDefault(); await sb.auth.signOut(); toast('Signed out.'); location.hash = '#/'; };
    const fb = document.getElementById('find-btn'); if (fb) fb.onclick = openFinder;
    const rt = document.getElementById('replay-tour'); if (rt) rt.onclick = () => { if (window.DIALDHelp) window.DIALDHelp.replay(); };
    const b1 = document.getElementById('signout'), b2 = document.getElementById('signout-m');
    if (b1) b1.onclick = so; if (b2) b2.onclick = so;
    const btn = document.getElementById('acct-btn'), pop = document.getElementById('acct-pop');
    if (btn) {
      const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      btn.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); };
      pop.onclick = e => { if (e.target.closest('a')) close(); };
      document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }
  }
  // "DIALD Cycle" menu: hover or focus opens it on a computer; the arrow button opens it on touch screens.
  (() => {
    const b = document.getElementById('drop-btn'), d = b && b.closest('.nav-drop'); if (!b) return;
    const close = () => { d.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); };
    b.onclick = e => { e.stopPropagation(); const o = d.classList.toggle('open'); b.setAttribute('aria-expanded', o); };
    d.querySelectorAll('.drop-menu a').forEach(a => a.addEventListener('click', () => { close(); a.blur(); d.classList.add('shut'); }));
    d.addEventListener('mouseleave', () => d.classList.remove('shut'));
    document.addEventListener('click', e => { if (!d.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  })();
  document.getElementById('menu-btn').onclick = () => {
    const n = document.getElementById('nav'); n.classList.toggle('open');
    document.getElementById('menu-btn').setAttribute('aria-expanded', n.classList.contains('open'));
  };

  /* ---------- HOME ---------- */
  const CYCLE = [
    ['Profile', 'Enter each year’s Listening, Speaking, Reading, and Writing levels. Levels only — never names.'],
    ['Pattern Indicator', 'See the learner’s quadrant, whether oral language and literacy move apart, and a trajectory signal.'],
    ['Instructional Focus', 'Get Library lesson pathways that match the learner’s priorities.'],
    ['Response', 'At the review point, record progress. DIALD reads it as Positive, Partial, or Limited.'],
    ['Adaptation', 'Keep, adjust, intensify, or change the support. New evidence returns to the Profile.']
  ];
  // Five-segment wheel. Each stage has a color and a simple line icon (drawn in a 24x24 box).
  const STAGE_LOOK = [
    { c: '#1B3A5C', t: '#fff', i: '<path d="M4 20V13M9.3 20V8M14.6 20V11M20 20V5"/><path d="M2.5 21.5h19"/>' },
    { c: '#2C6E91', t: '#fff', i: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/><circle cx="7.5" cy="7.5" r="1.6" fill="currentColor"/>' },
    { c: '#2A9488', t: '#fff', i: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>' },
    { c: '#E3A93B', t: '#1B3A5C', i: '<path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/>' },
    { c: '#C8673F', t: '#fff', i: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>' }
  ];
  function cycleHTML(id) {
    const n = CYCLE.length, C = 200, RO = 194, RI = 98, RM = 146, step = 2 * Math.PI / n;
    const pt = (r, a) => (C + r * Math.cos(a)).toFixed(2) + ' ' + (C + r * Math.sin(a)).toFixed(2);
    // Puzzle joint on the radial edge at angle a: a round knob with a narrow neck that pokes
    // toward increasing angles. A segment draws it as a tab on its end edge (outer -> inner)
    // and as the matching slot on its start edge (inner -> outer).
    const KR = 15, KN = 8, KD = Math.sqrt(KR * KR - KN * KN);
    const joint = (a, inward) => {
      const t = [-Math.sin(a), Math.cos(a)], u = [Math.cos(a), Math.sin(a)];
      const P = r => [C + r * u[0], C + r * u[1]];
      const [A, B] = inward ? [P(RM + KN), P(RM - KN)] : [P(RM - KN), P(RM + KN)];
      const M = P(RM), far = [M[0] + (KD + KR) * t[0], M[1] + (KD + KR) * t[1]];
      const cross = (far[0] - A[0]) * (B[1] - far[1]) - (far[1] - A[1]) * (B[0] - far[0]);
      return `L${A[0].toFixed(2)} ${A[1].toFixed(2)} A${KR} ${KR} 0 1 ${cross > 0 ? 1 : 0} ${B[0].toFixed(2)} ${B[1].toFixed(2)}`;
    };
    const segs = CYCLE.map(([t], i) => {
      const L = STAGE_LOOK[i], a0 = -Math.PI / 2 - step / 2 + i * step, a1 = a0 + step, am = a0 + step / 2;
      const d = `M${pt(RO, a0)} A${RO} ${RO} 0 0 1 ${pt(RO, a1)} ${joint(a1, true)} L${pt(RI, a1)} A${RI} ${RI} 0 0 0 ${pt(RI, a0)} ${joint(a0, false)} Z`;
      // Every label block (number, icon, name) is centered on the middle of its piece:
      // same radius (middle of the band) and the piece's middle angle, for all five stages.
      const LR = 150, mx = +(C + LR * Math.cos(am)).toFixed(1), my = +(C + LR * Math.sin(am)).toFixed(1);
      const words = t.split(' '), two = words.length > 1;
      const H = two ? 78 : 62, top = my - H / 2;
      const label = two
        ? `<text x="${mx}" y="${top + 54}">${esc(words[0])}</text><text x="${mx}" y="${top + 70}">${esc(words.slice(1).join(' '))}</text>`
        : `<text x="${mx}" y="${top + 54}">${esc(t)}</text>`;
      return `<g class="seg" data-node="${i}" role="button" tabindex="0" aria-pressed="false" aria-label="Stage ${i + 1}: ${esc(t)}"
          style="--dx:${(6 * Math.cos(am)).toFixed(2)}px;--dy:${(6 * Math.sin(am)).toFixed(2)}px;--d:${i * 90}ms;color:${L.t}">
        <path d="${d}" fill="${L.c}"/>
        <text class="num" x="${mx}" y="${top + 6}">${i + 1}</text>
        <svg x="${mx - 12}" y="${top + 16}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${L.i}</svg>
        ${label}
      </g>`;
    }).join('');
    return `<div class="cycle-wrap">
      <div class="wheel" id="${id}">
        <svg class="wheel-art" viewBox="0 0 400 400" aria-label="The DIALD cycle: five stages">${segs}</svg>
        <div class="wheel-center" aria-live="polite">
          <small id="${id}-n">The DIALD cycle</small>
          <b id="${id}-t">Five stages</b>
          <p id="${id}-d">Choose a stage to learn more.</p>
        </div>
      </div>
      <div class="ring-desc" aria-hidden="true"><b id="${id}-t2">The DIALD cycle</b><p id="${id}-d2">Tap a stage to see what happens in it.</p></div>
    </div>`;
  }
  function bindCycle(id, onPick) {
    const box = document.getElementById(id); if (!box) return;
    const segs = [...box.querySelectorAll('[data-node]')];
    const center = box.querySelector('.wheel-center');
    const set = (k, v) => { const el = document.getElementById(id + k); if (el) el.textContent = v; };
    let locked = null, cur, fadeT = null;
    // The center text fades out, changes, and fades back in, so it never "jumps".
    const write = k => {
      if (k === null) {
        set('-n', 'The DIALD cycle'); set('-t', 'Five stages'); set('-d', 'Choose a stage to learn more.');
        set('-t2', 'The DIALD cycle'); set('-d2', 'Tap a stage to see what happens in it.');
      } else {
        const [t, d] = CYCLE[k];
        set('-n', 'Stage ' + (k + 1) + ' of 5'); set('-t', t); set('-d', d);
        set('-t2', (k + 1) + ' · ' + t); set('-d2', d);
      }
    };
    const show = k => {
      if (k === cur) return; cur = k;
      segs.forEach((x, j) => { x.classList.toggle('on', j === k); x.setAttribute('aria-pressed', j === k && locked === k); });
      box.classList.toggle('has-on', k !== null);
      if (k === null) box.style.removeProperty('--accent'); else box.style.setProperty('--accent', STAGE_LOOK[k].c);
      clearTimeout(fadeT);
      if (!center || matchMedia('(prefers-reduced-motion: reduce)').matches) { write(k); return; }
      center.classList.add('swap');
      fadeT = setTimeout(() => { write(k); center.classList.remove('swap'); }, 140);
    };
    // Hover previews a stage; a click pins it. Click it again, click outside the wheel, or press Esc to let go.
    // A click opens the stage's page in "The DIALD cycle".
    const toggle = k => { if (onPick) onPick(k); else location.hash = '#/framework?stage=' + (k + 1); };
    segs.forEach((g, k) => {
      g.onclick = e => { e.stopPropagation(); toggle(k); };
      g.onmouseenter = () => { if (locked === null) show(k); };
      g.onfocus = () => { if (locked === null) show(k); };
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(k); } };
    });
    box.onmouseleave = () => { if (locked === null) show(null); };
    const reset = () => { if (!document.body.contains(box)) { document.removeEventListener('click', outside); document.removeEventListener('keydown', esc); return; } if (locked !== null) { locked = null; show(null); } };
    const outside = e => { if (!box.contains(e.target)) reset(); };
    const esc = e => { if (e.key === 'Escape') reset(); };
    document.addEventListener('click', outside); document.addEventListener('keydown', esc);
    // Segments appear one after another when the wheel scrolls into view.
    if ('IntersectionObserver' in window) {
      box.classList.add('pre');
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { box.classList.remove('pre'); box.classList.add('in'); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(box);
    }
  }

  function home() { if (user) homeDashboard(); else landing('home', 'signin'); }

  // A whole class: the roster file is read in the browser (diald-roster.js).
  function classPage() {
    if (!window.DIALDRoster) { location.hash = '#/learner'; return; }
    window.DIALDRoster.render(main, {
      esc, profile, toast,
      ai: C.aiUrl && user && sb ? { ask: askAI, format: aiFormat, left: () => sb.rpc('ai_credits_left').then(({ data }) => data) } : null,
      openStudent: st => {
        openFromClass(st);
      }
    });
  }
  function openFromClass(st) {
    A = { planId: null, planNumber: null, inputs: st.inputs, ran: true, stage: 0, selected: [], progress: [], dirty: true, localName: st.name, support: st.support || null };
    persistA(); location.hash = '#/learner?keep=1';
  }

  /* ---------- Find a student (class loaded on this computer) ---------- */
  function openFinder() {
    if (!user) return;
    const R = window.DIALDRoster, has = R && R.hasData();
    const box = document.createElement('div'); box.className = 'finder'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Find a student');
    box.innerHTML = `<div class="finder-in"><div class="row" style="justify-content:space-between;align-items:center"><b>Find a student</b><button type="button" class="fb-x" aria-label="Close">×</button></div>
      ${has ? '<input id="fd-q" type="search" placeholder="Type part of a name or an ID" autocomplete="off"><ul id="fd-r" class="finder-list"></ul><p class="small" style="margin:6px 0 0">🔒 Searches the class file on this computer only.</p>'
        : '<p>No class is loaded on this computer yet.</p><a class="btn primary" href="#/class">Upload a class</a>'}</div>`;
    document.body.appendChild(box);
    const close = () => { box.remove(); document.removeEventListener('keydown', esc1); };
    const esc1 = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc1);
    box.onclick = e => { if (e.target === box || e.target.closest('.fb-x') || e.target.closest('a')) close(); };
    if (!has) return;
    const q = box.querySelector('#fd-q'), r = box.querySelector('#fd-r');
    const draw = () => {
      const hits = R.find(q.value);
      r.innerHTML = q.value.trim() ? (hits.map(h => `<li><button type="button" data-k="${esc(h.key)}"><b>${esc(h.name)}</b><span>${h.grade ? 'Grade ' + esc(h.grade) : ''}${h.group ? ' · ' + esc(h.group) : ''}${h.iep ? ' · IEP' : ''}${h.s504 ? ' · 504' : ''}</span></button></li>`).join('') || '<li class="small">No student matches.</li>') : '';
      r.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const st = R.studentFor(b.dataset.k); close(); if (st) openFromClass(st); });
    };
    q.oninput = draw; q.onkeydown = e => { if (e.key === 'Enter') { const b = r.querySelector('[data-k]'); if (b) b.click(); } };
    setTimeout(() => q.focus(), 30);
  }

  // Learner Trajectory: choose a whole class or one learner.
  function trajectoryHub(q) {
    if (q.get('sample') || q.get('new') || q.get('keep')) { location.replace('#/learner?' + q.toString()); return; }
    const R = window.DIALDRoster, cls = R && R.hasData() ? R.summary() : null;
    const cur = A.ran && !A.planId ? (A.localName || 'your current learner') : '';
    main.innerHTML = `<div class="page hub">
      <div class="eyebrow">Learner Trajectory</div>
      <h1>How do you want to start?</h1>
      <p class="lead" style="max-width:720px">Look at a whole class from your test export, or at one learner at a time. Both follow the five DIALD stages.</p>
      ${cls ? '<button class="btn" type="button" id="hub-find">🔍 Find a student in your class</button>' : ''}
      <div class="hub-grid">
        <a class="hub-card" href="#/class">
          <span class="hub-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M14 18.5c.5-2.3 1.9-3.6 3.5-3.6s3 1.3 3.5 3.6"/></svg></span>
          <b>A whole class</b>
          <span>Upload your class file (Excel or CSV). See every student’s profile, trajectory signal, and evidence in one place.</span>
          <small>${cls ? 'Your class is loaded: ' + cls.n + ' students →' : 'Excel template with instructions included →'}</small>
        </a>
        <a class="hub-card gold" href="#/learner${cur ? '' : '?new=1'}">
          <span class="hub-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 3.8-6 7-6s6 2 7 6"/></svg></span>
          <b>One learner</b>
          <span>Enter one learner’s levels by hand. DIALD builds the profile, then guides you through the next stages.</span>
          <small>${cur ? 'Continue with ' + esc(cur) + ' →' : 'Start with the data form →'}</small>
        </a>
      </div>
      ${cur ? '<p class="small"><a href="#/learner?new=1">Start a new learner instead</a> · <a href="#/learner?sample=ana">Open the sample case</a></p>' : '<p class="small">Want to see an example first? <a href="#/learner?sample=ana">Open the sample case</a>.</p>'}
      <h2 style="margin-top:34px">The five stages</h2>
      <ol class="stage-strip">${CYCLE.map(([t, d], i) => `<li style="--c:${STAGE_LOOK[i].c}"><a href="#/framework?stage=${i + 1}"><span>${i + 1}</span><b>${esc(t)}</b><p>${esc(d)}</p></a></li>`).join('')}</ol>
    </div>`;
    const hb = document.getElementById('hub-find'); if (hb) hb.onclick = openFinder;
  }

  function landing(next, mode) {
    document.body.classList.add('public');
    main.innerHTML = `<div class="landing">
      <section class="band hero-band">
        <div class="band-in land-hero">
          <div class="land-head">
            <div class="eyebrow light">Data-Informed Academic Language Development</div>
            <h1>From data to decision.</h1>
            <p class="lead">Read multilingual learners’ language levels over time and choose the right support from a library of lesson plans.</p>
            <div class="row pills">
              <a class="pill gold" href="#auth-box" data-auth="signup">Create a free account</a>
              <a class="pill line" href="#how">See how it works</a>
            </div>
            <p class="hero-note"><span class="dot" aria-hidden="true"></span>Levels only. DIALD never asks for student names.</p>
          </div>
          <aside class="card auth-card" id="auth-box"></aside>
        </div>
      </section>
      <nav class="jump" aria-label="On this page">
        <div class="jump-in">
          <a href="#how" data-jump="how" class="on">How it works</a>
          <a href="#profiles" data-jump="profiles">Four profiles</a>
          <a href="#about" data-jump="about">About DIALD</a>
          <a href="#start" data-jump="start">Get started</a>
        </div>
      </nav>
      <section class="sec" id="how">
        <div class="sec-in how">
          <div>
            <div class="eyebrow">The DIALD cycle</div>
            <h2>Five stages, one continuous cycle.</h2>
            <p>Each stage feeds the next. When new evidence arrives, it returns to the Profile and the cycle starts again.</p>
            <p class="small">Tap a stage to see what happens in it.</p>
          </div>
          <div class="land-cycle">${cycleHTML('ring')}</div>
        </div>
      </section>
      <section class="sec tint" id="profiles">
        <div class="sec-in how">
          <div>
            <div class="eyebrow">The Pattern Indicator</div>
            <h2>Four oral–literacy profiles.</h2>
            <p>DIALD compares <b>oral language</b> (Listening + Speaking) with <b>literacy</b> (Reading + Writing). Each year’s levels place a learner in one of four profiles.</p>
            <p>An area counts as <b>High</b> when both of its domains are at or above the reference level (level 3 by default). DIALD never averages levels.</p>
            <p class="small">A profile starts a conversation. It is not a label or a diagnosis.</p>
          </div>
          <div class="quad-wrap">
            <div class="quad-y" aria-hidden="true"><span>High</span><b>Oral language</b><span>Low</span></div>
            <div class="quad">
              <div class="qc q1"><i>Q1</i><b>Oral dominant</b><small>High oral · Low literacy</small><p>Speaking and listening are ahead of reading and writing. If this lasts for years, it can signal risk of long-term EL status.</p></div>
              <div class="qc q2"><i>Q2</i><b>Balanced</b><small>High oral · High literacy</small><p>Strong in both areas. Keep building academic language across content classes.</p></div>
              <div class="qc q3"><i>Q3</i><b>Lower in both</b><small>Low oral · Low literacy</small><p>Lower in both areas. Read it with the learner’s history, such as recent arrival or interrupted schooling.</p></div>
              <div class="qc q4"><i>Q4</i><b>Literacy dominant</b><small>Low oral · High literacy</small><p>Reading and writing are ahead. Use strengths in text to build academic talk.</p></div>
            </div>
            <div class="quad-x" aria-hidden="true"><span>Low</span><b>Literacy</b><span>High</span></div>
          </div>
        </div>
      </section>
      <section class="sec" id="about">
        <div class="sec-in">
          <div class="eyebrow">About DIALD</div>
          <h2>Questions teachers ask</h2>
          <div class="acc">
            <details open><summary><span>What is DIALD?</span><i aria-hidden="true"></i></summary><p>The Data-Informed Academic Language Development Framework. It uses data schools already collect — domain levels from tests like LAS Links or ACCESS — to spot learners who may be moving toward long-term English learner status, and connects them with targeted instruction.</p></details>
            <details><summary><span>Who is it for?</span><i aria-hidden="true"></i></summary><p>ESOL/TESOL, bilingual, ELA, and content-area teachers, coaches, and leaders who work with multilingual learners in grades K–12.</p></details>
            <details><summary><span>What data does DIALD use?</span><i aria-hidden="true"></i></summary><p>The Listening, Speaking, Reading, and Writing levels from your annual language test (for example, LAS Links or ACCESS), plus what you know about academic progress and earlier supports. Levels only: never student names or IDs.</p></details>
            <details><summary><span>Is it free?</span><i aria-hidden="true"></i></summary><p>Yes. Create a free teacher account to use the tool, browse the library, and save your plans.</p></details>
          </div>
        </div>
      </section>
      <section class="band cta-band" id="start">
        <div class="band-in cta-in">
          <div><h2>Ready to turn data into decisions?</h2><p>Free for educators. It takes less than a minute.</p></div>
          <a class="pill gold" href="#auth-box" data-auth="signup">Create a free account</a>
        </div>
      </section>
      <div class="mob-cta" id="mob-cta">
        <a class="pill gold" href="#auth-box" data-auth="signup">Create account</a>
        <a class="pill outline" href="#auth-box" data-auth="signin">Sign in</a>
      </div>
    </div>`;
    const box = document.getElementById('auth-box');
    authForm(box, next, mode);
    bindCycle('ring');
    bindLanding(box);
  }

  // In-page links on the landing page: jump nav, auth buttons, mobile CTA bar.
  function bindLanding(box) {
    main.querySelectorAll('a[href^="#"]:not([href^="#/"])').forEach(a => a.onclick = e => {
      e.preventDefault();
      const el = document.getElementById(a.getAttribute('href').slice(1)); if (!el) return;
      if (a.dataset.auth && box._setMode) box._setMode(a.dataset.auth);
      const y = el.getBoundingClientRect().top + window.scrollY - (a.dataset.auth ? 96 : 120);
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      if (a.dataset.auth) setTimeout(() => { const i = box.querySelector('#email'); if (i) i.focus({ preventScroll: true }); }, 450);
    });
    const jumps = [...main.querySelectorAll('[data-jump]')], mob = document.getElementById('mob-cta');
    const onScroll = () => {
      if (!document.body.contains(box)) { window.removeEventListener('scroll', onScroll); return; }
      let cur = jumps[0].dataset.jump;
      jumps.forEach(j => { const s = document.getElementById(j.dataset.jump); if (s && s.getBoundingClientRect().top < 180) cur = j.dataset.jump; });
      jumps.forEach(j => j.classList.toggle('on', j.dataset.jump === cur));
      const r = box.getBoundingClientRect();
      mob.classList.toggle('show', r.bottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Signed-in home: welcome, updates, class monitor, interactive quadrants, class movement, and the DIALD cycle.
  const QUAD_INFO = {
    Q1: { ex: [4, 4, 2, 2], what: 'Listening and speaking are at or above the reference level, but reading or writing is below it.', look: 'Does the gap last more than one year? A lasting oral-dominant pattern is linked to long-term EL risk.', focus: 'Academic reading and writing: text structure, vocabulary in context, and writing with models.' },
    Q2: { ex: [4, 4, 4, 3], what: 'All four domains are at or above the reference level.', look: 'Does the learner meet the state exit criteria? Are content grades and the state ELA test strong too?', focus: 'Keep building academic language across content classes, and monitor after exit.' },
    Q3: { ex: [2, 2, 1, 2], what: 'Oral language and literacy are both below the reference level.', look: 'Read it with the learner’s history: a recent arrival or interrupted schooling needs a different plan than years without growth.', focus: 'Foundational language and literacy together, with a lot of structured talk.' },
    Q4: { ex: [2, 3, 4, 4], what: 'Reading and writing are at or above the reference level, but listening or speaking is below it.', look: 'Is oral participation limited by confidence or by language? Check classroom talk, not only the test.', focus: 'Academic talk: discussion routines, sentence frames, and oral rehearsal before writing.' }
  };
  const UPDATES_DEFAULT = [
    'New Library: lessons by grade band, profile, and stage, plus 25 activities with lesson plans.',
    'New: strategies for students with IEPs or 504 plans, and push-in co-teaching models.',
    'New: find any student in your class with “Find a student” at the top of the page.',
    'New: state rules for Connecticut, Massachusetts, California, and New York.',
    'New: a Help page and a short guided tour. Find them under Help.',
    'Upload a whole class with the new Excel template in Learner Trajectory.',
    'Questions or ideas? Use the Questions? button at the bottom of the page.'
  ];
  function homeDashboard() {
    const first = profile && profile.full_name ? profile.full_name.split(' ')[0] : '';
    const R = window.DIALDRoster, sum = R ? R.summary() : null;
    const ups = (Array.isArray(C.updates) && C.updates.length ? C.updates : UPDATES_DEFAULT).slice(0, 8);
    const SIGS = [['Horizon', 'Near / past LTEL time', '#7a2a22'], ['Persistent', 'Persistent', '#a83c32'], ['Emerging', 'Emerging', '#E3A93B'], ['None', 'No persistent signal', '#2A9488'], ['NA', 'Not computable', '#9fb0c0']];
    const monitor = sum ? `<div class="card monitor">
        <div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="margin:0">Class monitor</h3>${sum.sample ? '<span class="chip">Example</span>' : '<span class="chip good">Your class</span>'}</div>
        <p class="small" style="margin:4px 0 12px">${sum.sample ? 'A fictional class. Upload your class to see yours.' : esc(sum.fileName) + ' · ' + sum.n + ' students'}</p>
        <div class="mon-bar" role="img" aria-label="Students by trajectory signal">${SIGS.map(([k, , c]) => sum.signals[k] ? `<i style="flex:${sum.signals[k]};background:${c}" title="${sum.signals[k]}"></i>` : '').join('')}</div>
        <ul class="mon-list">${SIGS.map(([k, l, c]) => sum.signals[k] ? `<li><i style="background:${c}"></i>${esc(l)}<b>${sum.signals[k]}</b></li>` : '').join('')}</ul>
        <div class="mon-q">${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `<div><small>${q}</small><b>${sum.quadrants[q]}</b></div>`).join('')}</div>
        <p class="small" style="margin:10px 0 0">${sum.mayExit} may meet exit criteria · ${sum.concerns3} with 3+ concerns</p>
        <a class="btn ${sum.sample ? 'primary' : ''}" href="#/class" style="margin-top:12px;width:100%;justify-content:center">${sum.sample ? 'Upload your class' : 'Open my class →'}</a>
      </div>` : '';
    main.innerHTML = `<div class="home">
      <section class="band hero-band slim">
        <div class="band-in home-hero">
          <div><div class="eyebrow light">Your DIALD workspace</div>
            <h1>${first ? 'Welcome, ' + esc(first) + '.' : 'Welcome.'}</h1>
            <p class="lead">From data to decision: read your learners’ language over time and choose the right support.</p></div>
          <div class="row"><button class="pill line" type="button" id="home-find">🔍 Find a student</button><a class="pill gold" href="#/analyze">Learner Trajectory</a><a class="pill line" href="#/library">Library</a></div>
        </div>
      </section>
      <div class="ticker" role="region" aria-label="Updates"><div class="ticker-in"><span class="ticker-tag">Updates</span>
        <div class="ticker-win" aria-live="polite"><ul id="tick">${ups.map((u, i) => `<li class="${i === 0 ? 'on' : ''}">${esc(u)}</li>`).join('')}</ul></div>
        <span class="ticker-dots">${ups.map((u, i) => `<button type="button" data-tick="${i}" aria-label="Update ${i + 1}" class="${i === 0 ? 'on' : ''}"></button>`).join('')}</span></div></div>
      <section class="sec"><div class="sec-in home-grid">
        <div class="card qx">
          <div class="eyebrow">The Pattern Indicator</div>
          <h2>Four oral–literacy profiles</h2>
          <p class="small" style="margin-top:0">Choose a profile to see what it means and what DIALD looks at next.</p>
          <div class="qx-wrap">
            <div class="qx-grid" role="tablist" aria-label="Profiles">
              <div class="qx-ax y" aria-hidden="true">Oral language →</div>
              ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `<button type="button" role="tab" class="qx-cell ${q.toLowerCase()}" data-qx="${q}"><i>${q}</i><b>${esc(E.QUADRANTS[q].name)}</b><small>${esc(E.QUADRANTS[q].short)}</small></button>`).join('')}
              <div class="qx-ax x" aria-hidden="true">Literacy →</div>
            </div>
            <div class="qx-detail" id="qx-detail" aria-live="polite"></div>
          </div>
        </div>
        ${monitor}
      </div></section>
      <section class="sec tint"><div class="sec-in">
        <div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px">
          <div><div class="eyebrow">Example</div><h2 style="margin-bottom:4px">How a class moves across levels</h2>
          <p class="small" style="margin:0" id="mv-note"></p></div>
          <div class="seg-ctl" role="tablist"><button type="button" data-mv="literacy" class="on">Literacy</button><button type="button" data-mv="oral">Oral language</button></div>
        </div>
        <div class="card" style="margin-top:14px"><div id="mv-chart"></div></div>
      </div></section>
      <section class="sec"><div class="sec-in how">
        <div><div class="eyebrow">The DIALD cycle</div><h2>Five stages, one continuous cycle.</h2>
          <p>Each stage feeds the next. When new evidence arrives, it returns to the Profile and the cycle starts again.</p>
          <div class="actions" style="margin-top:18px">
            <a class="action" href="#/analyze"><b>Learner Trajectory</b><span>Upload a class or analyze one learner.</span><i aria-hidden="true">→</i></a>
            <a class="action gold" href="#/library"><b>Browse the library</b><span>Pathways and activities for levels 1–4.</span><i aria-hidden="true">→</i></a>
            <a class="action navy" href="#/plans"><b>My plans</b><span id="plan-count">Reopen saved plans and record progress.</span><i aria-hidden="true">→</i></a>
          </div></div>
        <div class="land-cycle">${cycleHTML('ring')}</div>
      </div></section>
    </div>`;
    bindCycle('ring');
    const hf = document.getElementById('home-find'); if (hf) hf.onclick = openFinder;
    // Updates: one line at a time; pauses on hover; no motion when the user prefers less motion.
    const items = [...main.querySelectorAll('#tick li')], dots = [...main.querySelectorAll('[data-tick]')];
    let ti = 0, timer = null;
    const go = k => { ti = (k + items.length) % items.length; items.forEach((li, j) => li.classList.toggle('on', j === ti)); dots.forEach((d, j) => d.classList.toggle('on', j === ti)); };
    const play = () => { clearInterval(timer); if (items.length > 1) timer = setInterval(() => { if (!document.body.contains(main.querySelector('#tick'))) return clearInterval(timer); go(ti + 1); }, 5000); };
    dots.forEach(d => d.onclick = () => { go(Number(d.dataset.tick)); play(); });
    const tk = main.querySelector('.ticker'); tk.onmouseenter = () => clearInterval(timer); tk.onmouseleave = play;
    play();
    // Interactive quadrants.
    const showQ = q => {
      const Q = E.QUADRANTS[q], I = QUAD_INFO[q];
      main.querySelectorAll('[data-qx]').forEach(b => { b.classList.toggle('on', b.dataset.qx === q); b.setAttribute('aria-selected', b.dataset.qx === q); });
      main.querySelector('#qx-detail').innerHTML = `<div class="qx-head"><i class="qx-pill ${q.toLowerCase()}">${q}</i><b>${esc(Q.name)}</b></div>
        <p>${esc(I.what)}</p>
        <div class="qx-ex"><span>Example</span>${['L', 'S', 'R', 'W'].map((d, k) => `<span class="lv ${I.ex[k] >= 3 ? 'hi' : 'lo'}"><small>${d}</small>${I.ex[k]}</span>`).join('')}</div>
        <p><b>What DIALD looks at next:</b> ${esc(I.look)}</p><p><b>Support focus:</b> ${esc(I.focus)}</p>`;
    };
    main.querySelectorAll('[data-qx]').forEach(b => { b.onclick = () => showQ(b.dataset.qx); });
    showQ('Q1');
    // Class movement chart (stacked bars by year).
    const LV = ['#c9dde6', '#9cc3d2', '#5fb3a8', '#2A9488', '#1B3A5C', '#0f2236'];
    const drawMv = kind => {
      main.querySelectorAll('[data-mv]').forEach(b => b.classList.toggle('on', b.dataset.mv === kind));
      const dist = R ? R.levelDistribution(kind) : { years: [], sample: true };
      main.querySelector('#mv-note').textContent = (dist.sample ? 'A fictional class. ' : 'Your class. ') + 'Each bar is one school year; each color is a level (the lower level of ' + (kind === 'oral' ? 'Listening and Speaking' : 'Reading and Writing') + ').';
      const maxLv = Math.max(4, ...dist.years.map(y => y.counts.reduce((m, c, i) => (c ? i + 1 : m), 0)));
      const el = main.querySelector('#mv-chart');
      if (!dist.years.length) { el.innerHTML = '<p class="small">Not enough years to show.</p>'; return; }
      el.innerHTML = `<div class="mv">${dist.years.map(y => `<div class="mv-row"><span class="mv-y">${esc(y.label)}</span><div class="mv-bar">${y.counts.slice(0, maxLv).map((c, i) => c ? `<i style="--w:${(c / y.n * 100).toFixed(1)}%;background:${LV[i]};color:${i >= 3 ? '#fff' : '#1B3A5C'}" title="Level ${i + 1}: ${c} of ${y.n}">${c / y.n >= 0.08 ? Math.round(c / y.n * 100) + '%' : ''}</i>` : '').join('')}</div><span class="mv-n">${y.n}</span></div>`).join('')}</div>
        <div class="mv-legend">${LV.slice(0, maxLv).map((c, i) => `<span><i style="background:${c}"></i>Level ${i + 1}</span>`).join('')}<span class="small" style="margin-left:auto">Students per year →</span></div>`;
      requestAnimationFrame(() => el.querySelectorAll('.mv-bar i').forEach(i => i.classList.add('in')));
    };
    main.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => drawMv(b.dataset.mv));
    drawMv('literacy');
    if (sb) sb.from('plans').select('id', { count: 'exact', head: true }).then(({ count }) => {
      const el = document.getElementById('plan-count');
      if (el && typeof count === 'number') el.textContent = count ? `${count} saved plan${count === 1 ? '' : 's'}. Reopen them and record progress.` : 'No saved plans yet.';
    });
    if (window.DIALDHelp && profile) window.DIALDHelp.maybeTour();
  }

  async function welcomeHome() {
    const first = profile && profile.full_name ? profile.full_name.split(' ')[0] : '';
    main.innerHTML = `<div>
      <section class="band hero-band slim">
        <div class="band-in">
          <div class="eyebrow light">Your DIALD workspace</div>
          <h1>${first ? 'Welcome, ' + esc(first) + '.' : 'Welcome.'}</h1>
          <p class="lead">What would you like to do today?</p>
        </div>
      </section>
      <section class="sec">
        <div class="sec-in how">
          <div>
            <div class="actions">
              <a class="action" href="#/analyze?new=1"><b>Learner Trajectory</b><span>Analyze one learner’s levels over time and get matching pathways.</span><i aria-hidden="true">→</i></a>
              <a class="action gold" href="#/library"><b>Browse the library</b><span>Pathways and activities with adaptations for levels 1–4.</span><i aria-hidden="true">→</i></a>
              <a class="action navy" href="#/plans"><b>My plans</b><span id="plan-count">Reopen saved plans and record progress.</span><i aria-hidden="true">→</i></a>
            </div>
            <p class="small" style="margin-top:18px">Want to see an example first? <a href="#/analyze?sample=ana">Open the sample case</a>.</p>
          </div>
          <div class="land-cycle">${cycleHTML('ring')}</div>
        </div>
      </section>
    </div>`;
    bindCycle('ring');
    if (sb) {
      const { count } = await sb.from('plans').select('id', { count: 'exact', head: true });
      const el = document.getElementById('plan-count');
      if (el && typeof count === 'number') el.textContent = count ? `${count} saved plan${count === 1 ? '' : 's'}. Reopen them and record progress.` : 'No saved plans yet.';
    }
  }

  function matrixHTML(res) {
    const by = { Q1: [], Q2: [], Q3: [], Q4: [] };
    if (res) res.rows.forEach((r, i) => by[r.quadrant].push({ label: r.label, last: i === res.rows.length - 1 }));
    const cell = id => {
      const q = E.QUADRANTS[id], on = res && res.quadrant && res.quadrant.id === id;
      return `<div class="cell ${on ? 'on' : ''}"><b>${id} — ${esc(q.name)}</b><small>${esc(q.short)}</small>
        ${by[id].length ? `<div class="yrs">${by[id].map(y => `<span class="${y.last ? 'last' : ''}">${esc(y.label)}</span>`).join('')}</div>` : ''}</div>`;
    };
    return `<div class="matrix" role="img" aria-label="Four quadrants: Q1 oral dominant, Q2 balanced, Q3 lower-performance profile, Q4 literacy dominant">
      <div class="ax y">High oral</div>${cell('Q1')}${cell('Q2')}
      <div class="ax y">Low oral</div>${cell('Q3')}${cell('Q4')}
      <div></div><div class="ax">Low literacy</div><div class="ax">High literacy</div></div>`;
  }

  /* ---------- ANALYZE (5 stages) ---------- */
  function analyzePage(q) {
    if (q.get('sample') === 'ana') {
      A = freshA(); A.inputs = JSON.parse(JSON.stringify(SAMPLE)); A.sample = true; persistA();
      history.replaceState(null, '', '#/learner'); setNav('analyze');
    } else if (q.get('new') === '1') {
      A = freshA(); persistA(); history.replaceState(null, '', '#/learner');
    } else if (q.get('keep')) {
      history.replaceState(null, '', '#/learner');
    } else if (A.planId) {
      // leaving a saved plan: start fresh
      A = freshA(); persistA();
    }
    renderAnalyze();
  }

  function renderAnalyze() {
    const res = result();
    if (!res && A.stage > 0) A.stage = 0;
    const editing = !res || !!A.editing;
    const title = A.planId ? (A.title || 'Plan ' + A.planNumber) : A.localName || 'Learner Trajectory';
    main.innerHTML = `<div class="page">
      <div class="row" style="justify-content:space-between">
        <div><div class="eyebrow">${A.planId ? 'Saved plan' : A.localName ? 'From your file' : 'DIALD analysis'}${A.sample ? ' · Sample case (fictional)' : ''}</div><h1 style="margin-bottom:4px">${esc(title)}${A.planId && A.localName ? ` <span class="local-name">${esc(A.localName)}</span>` : ''}</h1>
        <p class="small" style="margin:0">${A.localName ? '<span class="local-chip">🔒 Name shown only on this computer</span> Saving a plan stores levels and results, never the name.' : 'Levels only. No names, IDs, or details that identify a student.'}</p></div>
        <div class="row">${A.planId ? '<a class="btn" href="#/plans">← My plans</a>' : A.localName ? '<a class="btn" href="#/class">← My class</a>' : '<a class="btn" href="#/analyze">← Learner Trajectory</a>'}<a class="btn" href="#/learner?new=1">Start new</a>${!A.planId ? '<a class="btn" href="#/learner?sample=ana">Load sample case</a>' : ''}</div>
      </div>
      <div class="stages" role="tablist"><button role="tab" data-edit class="data-tab ${editing ? 'on' : ''}" aria-selected="${editing}"><span>✎</span>Data</button>${STAGES.map((s, i) => `<button role="tab" data-stage="${i}" class="${!editing && A.stage === i ? 'on' : ''}" ${!res || editing ? 'disabled' : ''} aria-selected="${!editing && A.stage === i}"><span>0${i + 1}</span>${s}</button>`).join('')}</div>
      <div id="stage"></div>
    </div>
    <div class="savebar" id="savebar"></div>`;
    $$('[data-stage]').forEach(b => b.onclick = () => { A.stage = Number(b.dataset.stage); persistA(); renderAnalyze(); });
    $('[data-edit]').onclick = () => { if (!editing) { A.editing = true; persistA(); renderAnalyze(); } };
    if (editing) dataForm(res); else [profileStage, patternStage, focusStage, responseStage, adaptationStage][A.stage](res);
    renderSaveBar(res);
  }

  function levelSelect(pi, d, v) {
    const vals = Array.from({ length: C.maxLevel }, (_, i) => i + 1);
    if (v != null && !vals.includes(v)) vals.push(v), vals.sort((a, b) => a - b); // decimals or level 6 from a file
    const opts = ['<option value="">—</option>'].concat(vals.map(x => `<option ${v === x ? 'selected' : ''}>${x}</option>`));
    return `<select id="lv-${pi}-${d}" aria-label="${esc(A.inputs.periods[pi].label)} ${d}">${opts.join('')}</select>`;
  }

  // Step before the five stages: the data form. The Profile is built from it.
  function dataForm(res) {
    const I = A.inputs;
    $('#stage').innerHTML = `<div class="split">
      <div class="card">
        <div class="eyebrow">Learner data</div>
        <h2>Language proficiency over time</h2>
        <p>Enter the domain levels from each annual assessment (for example, LAS Links levels 1–${C.maxLevel}), oldest first. Leave a row empty if it is not available.</p>
        <table class="levels"><thead><tr><th>Period</th>${DOMAINS.map(d => `<th>${cap(d)}</th>`).join('')}</tr></thead>
        <tbody>${I.periods.map((p, i) => `<tr><td>${esc(p.label)}</td>${DOMAINS.map(d => `<td>${levelSelect(i, d, p[d])}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <div class="row" style="margin:8px 0 18px">
          <button class="btn" id="add-year" ${I.periods.length >= 6 ? 'disabled' : ''}>+ Add a year</button>
          <button class="btn ghost" id="rm-year" ${I.periods.length <= 1 ? 'disabled' : ''}>Remove last year</button>
        </div>
        <div class="fields">
          <div><label for="years">Years of ELD services</label><input id="years" type="number" min="0" max="15" step="1" value="${esc(I.years)}" placeholder="e.g. 5"></div>
          <div><label for="grade">Grade band</label><select id="grade"><option value="">Any</option>${L.GRADES.map(g => `<option ${I.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        </div>
        <h3 style="margin-top:22px">Academic literacy evidence</h3>
        <p class="small" style="margin-top:0">From local reading benchmarks, curriculum-based measures, or writing assessments.</p>
        <div class="fields">
          <div><label for="ac-status">Current performance</label><select id="ac-status">${opt([['unknown', 'Not available'], ['below', 'Below expectations'], ['approaching', 'Approaching expectations'], ['meets', 'Meets expectations']], I.academic.status)}</select></div>
          <div><label for="ac-trend">Trend over time</label><select id="ac-trend">${opt([['unknown', 'Unknown'], ['improving', 'Improving'], ['flat', 'Not improving'], ['declining', 'Declining']], I.academic.trend)}</select></div>
        </div>
        <h3 style="margin-top:22px">Earlier targeted support</h3>
        <div class="fields"><div><label for="prior">Response to targeted intervention (beyond general ELD)</label><select id="prior">${opt([['none', 'None documented'], ['positive', 'Positive'], ['partial', 'Partial'], ['limited', 'Limited']], I.priorResponse)}</select></div></div>
        <p id="p-err" class="err" role="alert"></p>
        <div class="row"><button class="btn primary" id="run">Build the profile →</button>${res ? '<button class="btn ghost" id="cancel-edit" type="button">Back to the profile</button>' : ''}</div>
      </div>
      <div class="stack">
        <div class="privacy-note"><span aria-hidden="true">🔒</span><div><b>Do not enter student names or IDs.</b> This tool works with levels only. If you save a plan, it is named “Plan 1, Plan 2…” automatically.</div></div>
        <div class="card"><h3>Reference level</h3>
          <p class="small">Oral (Listening + Speaking) or Literacy (Reading + Writing) counts as <b>High</b> when both domains are at or above this level. This is a provisional criterion; adjust it to your assessment.</p>
          <label for="high">High = level</label><select id="high">${Array.from({ length: C.maxLevel - 1 }, (_, i) => `<option ${I.highLevel === i + 2 ? 'selected' : ''} value="${i + 2}">${i + 2} or above</option>`).join('')}</select>
          <div class="fields" style="margin-top:12px">
            <div style="grid-column:1/-1"><label for="st-rules">State rules</label><select id="st-rules">${window.DIALDStates.STATES.map(s => `<option value="${s.code}" ${stateOf(I) === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}<option value="" ${stateOf(I) ? '' : 'selected'}>Other state (general rule)</option></select></div>
            <div><label for="horizon">LTEL horizon</label><select id="horizon">${[5, 6, 7].map(v => `<option value="${v}" ${(Number(I.horizon) || 6) === v ? 'selected' : ''}>${v} years</option>`).join('')}</select></div>
            <div><label for="exitlv">Exit check</label><select id="exitlv">${[3, 4, 5].map(v => `<option value="${v}" ${(Number(I.exitLevel) || 4) === v ? 'selected' : ''}>All domains ${v}+</option>`).join('')}</select></div>
          </div>
          <p class="small" style="margin-bottom:0">Provisional parameters for the trajectory signal. Use your state's definitions.</p>
        </div>
        <div class="card"><h3>How DIALD reads the data</h3><p class="small">Levels are ordinal categories. DIALD does not average or subtract them. It compares domains, follows them across years, and combines them with academic and instructional evidence. Unchanged levels do not always mean no growth inside a band.</p></div>
      </div></div>`;
    $('#add-year').onclick = () => { readProfile(); A.inputs.periods.push(blankPeriod(A.inputs.periods.length + 1)); persistA(); renderAnalyze(); };
    $('#rm-year').onclick = () => { readProfile(); A.inputs.periods.pop(); persistA(); renderAnalyze(); };
    $('#run').onclick = () => {
      readProfile();
      const I2 = A.inputs, filled = I2.periods.filter(p => DOMAINS.some(d => p[d]));
      const partial = filled.filter(p => DOMAINS.some(d => !p[d]));
      const err = $('#p-err');
      if (!filled.length) { err.textContent = 'Enter the four domain levels for at least one year.'; return; }
      if (partial.length) { err.textContent = 'Complete all four domains for ' + partial.map(p => p.label).join(', ') + ', or clear that row.'; return; }
      A.ran = true; A.dirty = true; A.editing = false; A.stage = 0; persistA(); renderAnalyze();
    };
    const ce = $('#cancel-edit'); if (ce) ce.onclick = () => { A.editing = false; persistA(); renderAnalyze(); };
    main.querySelectorAll('#stage select, #stage input').forEach(el => el.addEventListener('change', () => { readProfile(); A.dirty = true; persistA(); renderSaveBar(result()); }));
  }
  // State rules: the plan's own choice, else the teacher's profile state.
  function stateOf(I) { return I.state != null ? I.state : window.DIALDStates.codeFor(profile && profile.state); }
  function opt(pairs, cur) { return pairs.map(([v, t]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`).join(''); }

  function readProfile() {
    if (!$('#run')) return;
    const I = A.inputs;
    I.periods.forEach((p, i) => DOMAINS.forEach(d => { const v = $('#lv-' + i + '-' + d).value; p[d] = v ? Number(v) : null; }));
    const y = $('#years').value; I.years = y === '' ? '' : Math.max(0, Math.min(15, Math.round(Number(y))));
    I.grade = $('#grade').value;
    I.academic = { status: $('#ac-status').value, trend: $('#ac-trend').value };
    I.priorResponse = $('#prior').value;
    I.highLevel = Number($('#high').value);
    I.horizon = Number($('#horizon').value); I.exitLevel = Number($('#exitlv').value);
    I.state = $('#st-rules').value;
    // drop empty rows at the end only when analysing
    I.periods = I.periods.filter((p, i) => i < 1 || DOMAINS.some(d => p[d]) || i < I.periods.length);
  }

  // IEP / 504 from the class file (kept on this computer only).
  function supportNote() {
    const sp = A.support; if (!sp || (!sp.iep && !sp.s504)) return '';
    const what = [sp.iep ? 'an IEP (special education)' : '', sp.s504 ? 'a 504 plan' : ''].filter(Boolean).join(' and ');
    return `<div class="flag iep-flag">This learner has ${what}. Review language and learning needs together with the student’s team; DIALD does not separate the two. <a href="#/library/iep">Strategies for students with IEPs or 504 plans →</a></div>`;
  }

  // 01 · Profile: what the data says about the learner, in plain words.
  function profileStage(res) {
    const I = A.inputs, rows = res.rows, last = rows[rows.length - 1], L = last.levels, first = rows[0];
    const DN = { listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing' };
    const dirText = { oral: 'Oral language (listening and speaking) is ahead of literacy (reading and writing).', literacy: 'Literacy (reading and writing) is ahead of oral language (listening and speaking).', even: 'All four domains are at the same level.', mixed: 'The domains are mixed: neither oral language nor literacy is clearly ahead.' }[last.direction];
    const below = DOMAINS.filter(d => L[d] < res.high), st = res.state || {};
    const has = k => rows.some(r => r.levels[k] != null && r.levels[k] !== '');
    const extra = [rows.some(r => r.levels.scale) ? 'scale scores' : '', has('overall') ? 'overall level' : '', has('ela') ? 'state ELA test' : '', has('bench') ? 'benchmark' : ''].filter(Boolean);
    const cell = (v, prev) => { const up = prev != null && v > prev, dn = prev != null && v < prev; return `<td class="lvc l${Math.min(6, Math.floor(v))}">${v}${up ? ' <em class="up">▲</em>' : dn ? ' <em class="dn">▼</em>' : ''}</td>`; };
    $('#stage').innerHTML = `<div class="split">
      <div class="stack">
        <div class="card">
          <div class="eyebrow">01 · Profile</div>
          <h2>Learner profile</h2>
          <div class="row" style="margin:4px 0 12px;gap:6px">
            ${I.grade ? `<span class="chip">Grades ${esc(I.grade)}</span>` : ''}${I.years !== '' && I.years != null ? `<span class="chip">${esc(I.years)} years in services</span>` : ''}${I.test ? `<span class="chip">${esc(I.test)}</span>` : ''}<span class="chip">Rules: ${esc(st.code ? st.name : 'General')}</span>
          </div>
          <ul class="profile-list">
            <li><b>${rows.length} year${rows.length > 1 ? 's' : ''} of results</b>${rows.length > 1 ? ' (' + esc(first.label) + ' to ' + esc(last.label) + ')' : ''}.</li>
            <li><b>Latest (${esc(last.label)}):</b> ${DOMAINS.map(d => DN[d] + ' ' + L[d]).join(' · ')}.</li>
            <li>${esc(dirText)}</li>
            <li>${below.length ? 'Below the reference level (' + res.high + '): <b>' + below.map(d => DN[d]).join(', ') + '</b>.' : 'All four domains are at or above the reference level (' + res.high + ').'}</li>
            <li>${extra.length ? 'Other evidence in the data: ' + extra.join(', ') + '.' : 'Only domain levels were entered. Scale scores, the state ELA test, or a benchmark would make the next stages stronger.'}</li>
          </ul>
          ${supportNote()}
          <h3>Levels by year</h3>
          <table class="tbl lv-tbl"><thead><tr><th>Year</th>${DOMAINS.map(d => `<th>${DN[d]}</th>`).join('')}</tr></thead>
            <tbody>${rows.map((r, i) => `<tr><td>${esc(r.label)}</td>${DOMAINS.map(d => cell(r.levels[d], i ? rows[i - 1].levels[d] : null)).join('')}</tr>`).join('')}</tbody></table>
          <p class="small">▲ ▼ = level went up or down from the year before. The Profile is a description, not a judgment.</p>
          <div class="row" style="margin-top:14px"><button class="btn primary" id="go-pattern">See the pattern →</button><button class="btn" id="edit-data" type="button">✎ Edit the data</button></div>
        </div>
      </div>
      <div class="stack">
        <div class="card"><h3>Four-quadrant matrix</h3>${matrixHTML(res)}<p class="small">${esc(res.quadrant.note)}</p></div>
        <div class="card"><h3>What happens next</h3><p class="small" style="margin:0">The <b>Pattern Indicator</b> reads these years together: the quadrant over time, growth, the trajectory signal, and the evidence from your state’s rules.</p></div>
      </div></div>`;
    $('#go-pattern').onclick = () => { A.stage = 1; persistA(); renderAnalyze(); };
    $('#edit-data').onclick = () => { A.editing = true; persistA(); renderAnalyze(); };
  }

  /* ---------- Explain with AI (Cloudflare Worker; 20 uses per teacher per day) ---------- */
  function aiPayload(res) {
    const I = A.inputs;
    return {
      grade: I.grade || '', years: I.years === '' || I.years == null ? null : Number(I.years), high: res.high,
      state: res.state && res.state.code ? res.state.name : '', test: I.test || '',
      rows: res.rows.map((r, i) => {
        const o = { label: (String(r.label).match(/(19|20)\d{2}(\s*[-–/]\s*\d{2,4})?/) || ['Year ' + (i + 1)])[0] };
        DOMAINS.forEach(d => { o[d] = r.levels[d]; });
        if (r.levels.ela != null) o.ela = r.levels.ela; if (r.levels.bench != null) o.bench = r.levels.bench;
        return o;
      }),
      quadrant: res.quadrant ? res.quadrant.id + ' ' + res.quadrant.name : '', signal: res.signal.label,
      evidence: res.signal.evidence, criteria: res.criteria.map(c => c.label + ': ' + c.text),
      exit: res.signal.flags.mayExit ? 'The latest results meet the exit criteria. ' + (res.signal.flags.exitText || '') : ''
    };
  }
  function aiFormat(t) {
    const H = ['Patterns in your class', 'Ideas for the whole class', 'Small groups to consider', 'What to monitor', 'Possible reasons to check', 'What to try in the next 6 weeks', 'How to measure progress', 'Questions for your team', 'What the data shows', 'What to look at next'];
    let html = '', list = false;
    String(t).split(/\n+/).map(x => x.trim().replace(/^#+\s*|\*\*/g, '')).filter(Boolean).forEach(line => {
      const h = H.find(x => line.toLowerCase().replace(/:$/, '') === x.toLowerCase());
      if (h) { if (list) { html += '</ul>'; list = false; } html += `<h4>${esc(h)}</h4>`; return; }
      if (/^[-•*]\s+|^\d+[.)]\s+/.test(line)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${esc(line.replace(/^[-•*]\s+|^\d+[.)]\s+/, ''))}</li>`; return; }
      if (list) { html += '</ul>'; list = false; }
      html += `<p>${esc(line)}</p>`;
    });
    return html + (list ? '</ul>' : '');
  }
  // One request to the AI Worker. Returns { text, left } or throws with a message for the teacher.
  async function askAI(task, data) {
    const { data: s } = await sb.auth.getSession(); const token = s && s.session && s.session.access_token;
    if (!token) throw new Error('Please sign in again.');
    const r = await fetch(C.aiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ task, data }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) throw new Error('You used your 20 AI requests for today. Come back tomorrow.');
    if (!r.ok) throw new Error(j.error || 'The AI is not available right now.');
    return j;
  }
  function bindAI(res) {
    const go = $('#ai-go'); if (!go) return;
    const left = $('#ai-left'), out = $('#ai-out');
    if (sb) sb.rpc('ai_credits_left').then(({ data }) => { if (typeof data === 'number' && left) left.textContent = data + ' of 20 left today'; });
    go.onclick = async () => {
      go.disabled = true; go.textContent = 'Writing…'; out.innerHTML = '<p class="small">This takes a few seconds.</p>';
      try {
        const j = await askAI('explain', aiPayload(res));
        out.innerHTML = `<div class="ai-text">${aiFormat(j.text)}</div><p class="small ai-note">Ideas written by AI from the data above. Use your professional judgment and what you know about the learner; this is not a diagnosis.</p>`;
        if (left && typeof j.left === 'number') left.textContent = j.left + ' of 20 left today';
        go.textContent = 'Get new ideas';
      } catch (e) { out.innerHTML = `<p class="err">${esc(e.message || 'Something went wrong.')}</p>`; go.textContent = 'Get ideas for this learner'; }
      go.disabled = false;
    };
  }

  function stateCard(st) {
    if (!st) return '';
    if (!st.code) return `<div class="card"><h3>Rules used: general</h3><p class="small">No state was chosen, so DIALD used its general rule: any growth counts, exit when all four domains reach the exit level, LTEL time of ${st.ltel.years} years. Choose your state in your profile or in Reference level.</p></div>`;
    const tag = x => x === 'verified' ? '<span class="chip good">Verified</span>' : '<span class="chip">To confirm</span>';
    return `<div class="card"><h3>Rules used: ${esc(st.name)}</h3>
      <dl class="rules">
        <dt>Language test</dt><dd>${esc(st.elp.test)}. ${esc(st.elp.growthText)}</dd>
        <dt>Exit criteria</dt><dd>${esc(st.exit.text)} ${tag(st.exit.status)}</dd>
        <dt>LTEL</dt><dd>${esc(st.ltel.text)} ${tag(st.ltel.status)}</dd>
        <dt>State ELA test</dt><dd>${esc(st.academic.test)}: ${st.academic.levels.map((l, i) => esc(l) + (i + 1 >= st.academic.meets ? ' ✓' : '')).join(' · ')}</dd>
      </dl>
      <p class="small">Checked ${esc(st.checked)}. Sources: ${st.sources.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}</p></div>`;
  }
  function patternStage(res) {
    const r = res.risk;
    $('#stage').innerHTML = `<div class="split">
      <div class="stack">
        <div class="card">
          <div class="eyebrow">02 · Pattern Indicator</div>
          <h2>Trajectory signal</h2>
          <div class="row" style="margin:6px 0 10px"><span class="badge ${r.level}">${esc(r.label)}</span>${res.quadrant ? quadChip(res.quadrant.id) : ''}${r.flags.years !== null ? `<span class="chip">${r.flags.years} years in services · horizon ${r.flags.horizon}</span>` : ''}</div>
          <p>${esc(r.text)}</p>
          ${r.evidence.length ? `<ul class="evidence">${r.evidence.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
          ${r.flags.mayExit ? `<div class="flag ok">${r.flags.exitState ? 'The latest results meet the ' + esc(r.flags.exitState) + ' exit criteria (' + esc(r.flags.exitText) + ')' : 'All four domains are at level ' + r.flags.exitLevel + ' or above'}. The learner may meet exit criteria: check the reclassification procedure before planning more intervention.</div>` : ''}
          ${supportNote()}
          ${r.flags.exitUnknown ? `<div class="flag">To check the ${esc(r.flags.exitState)} exit criteria, DIALD needs ${esc(r.flags.exitNeeds)}.</div>` : ''}
          ${r.flags.pastHorizon ? `<div class="flag">The learner has reached the ${r.flags.horizon}-year LTEL time criterion. Focus on the current need below.</div>` : ''}
          ${r.flags.accessRescale ? `<div class="flag">ACCESS 2025–26 restarted its scale scores. DIALD did not compare this year's scale scores with earlier years.</div>` : ''}
          ${r.model === 'CT' ? `<div class="flag ok">Expected growth = Connecticut LAS Links growth targets for the Oral and Literacy composites, by grade and level (CSDE growth model, 2017). Levels 4–5 only need to stay at 4 or above. Confirm the targets your district uses for the current LAS Links form.</div>` : ''}
          ${r.flags.ctSkipped ? `<div class="flag">Connecticut growth targets were not applied: they need all four scale scores and the grade for each year. DIALD used levels and any scale-score growth instead.</div>` : ''}
          <p class="small">${r.model === 'CT' ? 'Provisional and transparent: a composite is flagged when it grows less than ' + r.flags.growth.ptaFlag + '% of its Connecticut target (or drops below level 4); two years in a row make the signal persistent. The state targets are ambitious by design, so missing a target alone is not a flag.' : `Provisional and transparent: a domain is flagged when it is below level ${res.high} and did not grow; two intervals in a row make the signal persistent.`} These parameters are being validated. This is not a probability or a diagnosis. If the learner has an IEP, review language and learning needs together with your MTSS team.</p>
        </div>
        ${C.aiUrl && user ? `<div class="card ai-card" id="ai-card">
          <div class="row" style="justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">✨ Explain with AI</h3><span class="small" id="ai-left"></span></div>
          <p class="small" style="margin:6px 0 12px">Possible reasons to check, strategies to try for 6 weeks, a goal to measure, and questions for your team. DIALD sends only levels and results, never names.</p>
          <button class="btn primary" type="button" id="ai-go">Get ideas for this learner</button>
          <div id="ai-out" aria-live="polite"></div>
        </div>` : ''}
        <div class="card">
          <h3>Converging evidence</h3>
          <p class="small" style="margin-top:0">DIALD reads four kinds of evidence side by side. It counts concerns; it does not weight them, because the combination is still being validated.</p>
          <div class="dims">${res.criteria.map(c => `<div class="dim"><h3>${esc(c.label)}${statusChip(c.status)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>
          <p class="small"><b>${res.criteriaConcerns} of ${res.criteriaAvailable}</b> available criteria show a concern.</p>
        </div>
        ${stateCard(res.state)}
        <div class="card">
          <h3>Interpretation matrix</h3>
          <div class="dims">${Object.entries(res.dims).map(([k, d]) => `<div class="dim"><h3>${esc(E.DIM_LABEL[k])}${statusChip(d.status)}</h3><p>${esc(d.text)}</p></div>`).join('')}</div>
        </div>
        <div class="card">
          <h3>Year by year</h3>
          <table class="tbl"><thead><tr><th>Period</th>${DOMAINS.map(d => `<th>${D1[d]}</th>`).join('')}<th>Quadrant</th><th>Oral–literacy</th></tr></thead>
          <tbody>${res.rows.map(x => `<tr><td>${esc(x.label)}</td>${DOMAINS.map(d => `<td>${x.levels[d]}</td>`).join('')}<td>${x.quadrant}</td><td>${{ oral: 'Oral ahead', literacy: 'Literacy ahead', even: 'Even', mixed: 'Mixed' }[x.direction]}</td></tr>`).join('')}</tbody></table>
          <p class="small">Reference: High = both domains at level ${res.high} or above.</p>
        </div>
      </div>
      <div class="stack">
        <div class="card"><h3>Four-quadrant matrix</h3>${matrixHTML(res)}
          ${res.quadrant ? `<p class="small" style="margin-top:12px">${esc(res.quadrant.note)}</p>` : ''}</div>
        <button class="btn primary" id="go-focus">See instructional focus →</button>
      </div></div>`;
    $('#go-focus').onclick = () => { A.stage = 2; persistA(); renderAnalyze(); };
    bindAI(res);
  }

  function levelFor(res, a) {
    if (!res.latest) return 2;
    const lv = Math.min(...a.domains.map(d => res.latest.levels[d]));
    return Math.max(1, Math.min(4, lv));
  }

  function focusStage(res) {
    const matches = E.matchPathways(res, L.pathways, A.inputs.grade);
    if (!A.selectedTouched && !A.selected.length && matches.length) A.selected = matches.slice(0, 2).map(p => p.id);
    $('#stage').innerHTML = `<div class="card">
        <div class="eyebrow">03 · Instructional Focus</div>
        <h2>Instructional priorities</h2>
        <div class="row">${res.priorities.length ? res.priorities.map(d => `<span class="chip q">${cap(d)}</span>`).join('') : '<span class="chip">No domain below the reference level</span>'}${res.quadrant ? quadChip(res.quadrant.id) : ''}</div>
        <p class="small">Suggested pathways for educator review. Choose the ones you will use; they carry into Response.</p>
      </div>
      ${res.quadrant ? `<a class="card lesson-link" href="#/library/lessons/${L.BANDS[A.inputs.grade] ? A.inputs.grade : '6-8'}/${res.quadrant.id}"><b>📚 Intervention lessons for this profile</b><span>${esc(res.quadrant.id + ' · ' + res.quadrant.name)} route${L.BANDS[A.inputs.grade] ? ', ' + esc(L.BANDS[A.inputs.grade].name) : ''}: four 12-week stages in the Library →</span></a>` : ''}
      ${matches.length ? matches.map(p => pathwayCard(p, res)).join('') : `<div class="card"><p>No pathway in the library matches this profile yet. <a href="#/library">Browse the library</a>.</p></div>`}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="go-resp" ${A.selected.length ? '' : 'disabled'}>Record response →</button></div>`;
    $$('[data-use]').forEach(cb => cb.onchange = () => {
      A.selectedTouched = true;
      A.selected = cb.checked ? Array.from(new Set(A.selected.concat(cb.dataset.use))) : A.selected.filter(x => x !== cb.dataset.use);
      A.dirty = true; persistA(); $('#go-resp').disabled = !A.selected.length; renderSaveBar(res);
    });
    $('#go-resp').onclick = () => { A.stage = 3; persistA(); renderAnalyze(); };
    persistA();
  }

  function pathwayCard(p, res) {
    return `<div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div><h2 style="font-size:22px;margin-bottom:4px"><a href="#/pathway/${p.id}" style="text-decoration:none">${esc(p.title)}</a></h2>
        <div>${p.quadrants.map(quadChip).join('')}${domainChips(p.domains)}<span class="chip">${p.weeks} weeks</span>${sampleChip(p)}</div></div>
        <label class="row" style="font-weight:700;gap:8px;margin:0"><input type="checkbox" style="width:auto" data-use="${p.id}" ${A.selected.includes(p.id) ? 'checked' : ''}> Use this pathway</label>
      </div>
      <p>${esc(p.summary)}</p>
      ${p.phases.map(ph => `<div class="phase"><b>${esc(ph.name)}</b><div class="small">${esc(ph.focus)}</div>
        <div>${ph.activities.map(id => { const a = act(id); if (!a) return ''; const lv = levelFor(res, a); return `<div style="margin-top:6px"><a href="#/activity/${a.id}?level=${lv}">${esc(a.name)}</a> <span class="small">— adaptation for level ${lv}:</span> <span class="small">${esc(a.adaptations[lv])}</span></div>`; }).join('')}</div></div>`).join('')}
      <p class="small"><b>Progress measure:</b> ${esc(p.monitoring.measure)} · example baseline ${esc(p.monitoring.baseline)}, goal ${esc(p.monitoring.goal)}</p>
    </div>`;
  }

  function progressFor(id) {
    let e = A.progress.find(x => x.pathwayId === id);
    if (!e) { e = { pathwayId: id, baseline: '', current: '', goal: '', implementation: 'yes' }; A.progress.push(e); }
    return e;
  }

  function responseStage() {
    const ids = A.selected.filter(pw);
    $('#stage').innerHTML = `<div class="card"><div class="eyebrow">04 · Response</div><h2>How did the learner respond?</h2>
      <p>At the review point of each pathway, enter the baseline, the current result, and the goal on the same measure. DIALD classifies the response for each objective separately.</p></div>
      ${ids.length ? ids.map(id => { const p = pw(id), e = progressFor(id), c = E.classifyResponse(e); return `<div class="card" data-row="${id}">
        <h3>${esc(p.title)}</h3><p class="small" style="margin-top:0">${esc(p.monitoring.measure)}</p>
        <div class="fields">
          <div><label for="b-${id}">Baseline</label><input id="b-${id}" type="number" step="any" value="${esc(e.baseline)}" placeholder="e.g. ${esc(parseFloat(p.monitoring.baseline))}"></div>
          <div><label for="c-${id}">Current result</label><input id="c-${id}" type="number" step="any" value="${esc(e.current)}"></div>
          <div><label for="g-${id}">Goal</label><input id="g-${id}" type="number" step="any" value="${esc(e.goal)}" placeholder="e.g. ${esc(parseFloat(p.monitoring.goal))}"></div>
          <div><label for="i-${id}">Implemented as planned?</label><select id="i-${id}">${opt([['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']], e.implementation)}</select></div>
        </div>
        <p style="margin-top:12px" data-out="${id}"><span class="badge ${c.level}">${c.level}</span> <span>${esc(c.text)}</span></p>
      </div>`; }).join('') : '<div class="card"><p>Choose at least one pathway in Instructional Focus.</p></div>'}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="go-adapt">See adaptation →</button></div>`;
    ids.forEach(id => ['b', 'c', 'g', 'i'].forEach(k => $('#' + k + '-' + id).addEventListener('input', () => {
      const e = progressFor(id);
      e.baseline = $('#b-' + id).value; e.current = $('#c-' + id).value; e.goal = $('#g-' + id).value; e.implementation = $('#i-' + id).value;
      const c = E.classifyResponse(e);
      main.querySelector(`[data-out="${id}"]`).innerHTML = `<span class="badge ${c.level}">${c.level}</span> <span>${esc(c.text)}</span>`;
      A.dirty = true; persistA(); renderSaveBar(result());
    })));
    $('#go-adapt').onclick = () => { A.stage = 4; persistA(); renderAnalyze(); };
  }

  function adaptationStage(res) {
    const ids = A.selected.filter(pw);
    const others = E.matchPathways(res, L.pathways, A.inputs.grade).filter(p => !ids.includes(p.id));
    $('#stage').innerHTML = `<div class="card"><div class="eyebrow">05 · Adaptation</div><h2>What should change next?</h2>
      <p>Recommendations by objective, for educator review. Keep what works; adjust where progress is limited.</p></div>
      ${ids.map(id => { const p = pw(id), c = E.classifyResponse(progressFor(id)); return `<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(p.title)}</h3><span class="badge ${c.level}">${c.level}</span></div>
        <ul>${E.ADAPT[c.level].map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        ${c.level === 'Partial' ? `<p class="small"><b>Activities to add from this pathway:</b> ${p.phases.flatMap(ph => ph.activities).filter((v, i, a) => a.indexOf(v) === i).map(aid => `<a href="#/activity/${aid}?level=${levelFor(res, act(aid))}">${esc(act(aid).name)}</a>`).join(' · ')}</p>` : ''}
        ${c.level === 'Limited' ? `<p class="small"><b>Alternative pathways:</b> ${others.length ? others.map(o => `<a href="#/pathway/${o.id}">${esc(o.title)}</a>`).join(' · ') : 'none for this profile yet — <a href="#/library">browse the library</a>'}</p>` : ''}
      </div>`; }).join('')}
      <div class="card"><h3>Back to the Profile</h3><p>When the next assessment results arrive, add them as a new year. DIALD will reassess the pattern and the trajectory signal.</p>
        <button class="btn" id="next-cycle">+ Add next year’s levels</button></div>`;
    $('#next-cycle').onclick = () => { A.inputs.periods.push(blankPeriod(A.inputs.periods.length + 1)); A.stage = 0; A.editing = true; A.dirty = true; persistA(); renderAnalyze(); };
  }

  /* ---------- saving ---------- */
  function renderSaveBar(res) {
    const bar = document.getElementById('savebar'); if (!bar) return;
    if (!res) { bar.innerHTML = `<div class="savebar-in small">Complete the Profile to see the pattern. Nothing is saved until you choose to save.</div>`; return; }
    const label = A.planId ? (A.dirty ? 'Save changes' : 'Saved ✓') : 'Save as a plan';
    bar.innerHTML = `<div class="savebar-in">${user
      ? `<button class="btn primary" id="save" ${A.planId && !A.dirty ? 'disabled' : ''}>${label}</button><span class="small">${A.planId ? 'Plan ' + A.planNumber + ' · only you can see it' : 'Saved plans store levels and recommendations only.'}</span>`
      : `<a class="btn primary" href="#/login?next=analyze">Sign in to save this plan</a><span class="small">Your work stays on this page while you sign in.</span>`}</div>`;
    const b = document.getElementById('save'); if (b) b.onclick = savePlan;
  }

  async function savePlan() {
    if (!sb || !user) { location.hash = '#/login?next=analyze'; return; }
    const res = result(); const btn = document.getElementById('save'); btn.disabled = true; btn.textContent = 'Saving…';
    const row = {
      inputs: cleanInputs(A.inputs),
      result: { quadrant: res.quadrant && res.quadrant.id, risk: res.risk.level, priorities: res.priorities, concerns: res.concerns },
      pathway_ids: A.selected, progress: A.progress.filter(e => A.selected.includes(e.pathwayId))
    };
    let out;
    if (A.planId) {
      out = await sb.from('plans').update(row).eq('id', A.planId).select('id, plan_number').single();
    } else {
      const last = await sb.from('plans').select('plan_number').order('plan_number', { ascending: false }).limit(1);
      if (last.error) { saveError(last.error); return; }
      row.plan_number = ((last.data[0] && last.data[0].plan_number) || 0) + 1;
      out = await sb.from('plans').insert(row).select('id, plan_number').single();
    }
    if (out.error) { saveError(out.error); return; }
    A.planId = out.data.id; A.planNumber = out.data.plan_number; A.dirty = false; A.sample = false; persistA();
    if (A.localName && window.DIALDRoster) window.DIALDRoster.rememberPlanName(A.planId, A.localName);
    toast('Plan ' + A.planNumber + ' saved.');
    history.replaceState(null, '', '#/plan/' + A.planId); setNav('plans');
    renderAnalyze();
  }
  // Only the allowed fields go to the server (the database checks the same list).
  function cleanInputs(I) {
    const n = v => (typeof v === 'number' && isFinite(v) ? v : null);
    const lab = v => (window.DIALDRoster ? window.DIALDRoster.cleanLabel(v || '') : String(v || '').slice(0, 24)) || 'Year';
    return {
      grade: I.grade || '', years: I.years === '' || I.years == null ? '' : n(Number(I.years)), highLevel: n(I.highLevel) || 3,
      horizon: n(Number(I.horizon)) || 6, exitLevel: n(Number(I.exitLevel)) || 4, state: /^[A-Z]{2}$/.test(I.state || '') ? I.state : '', test: lab(I.test || '').replace(/^Year$/, ''),
      periods: (I.periods || []).map(p => {
        const o = { label: lab(p.label) }; DOMAINS.forEach(d => { o[d] = n(p[d]); });
        if (p.scale) { o.scale = {}; DOMAINS.forEach(d => { if (n(p.scale[d])) o.scale[d] = p.scale[d]; }); }
        if (n(p.overall)) o.overall = p.overall;
        if (/^(K|[0-9]{1,2})$/.test(String(p.grade || ''))) o.grade = String(p.grade);
        ['literacy', 'ela', 'bench'].forEach(k => { if (n(p[k])) o[k] = p[k]; });
        return o;
      }),
      academic: { status: (I.academic && I.academic.status) || 'unknown', trend: (I.academic && I.academic.trend) || 'unknown' },
      priorResponse: I.priorResponse || 'none'
    };
  }
  function saveError(err) { console.error(err); toast('Could not save: ' + (err.message || 'try again')); renderSaveBar(result()); }

  async function openPlan(id) {
    if (!(await requireLogin('plans'))) return;
    if (A.planId === id && A.ran) { renderAnalyze(); return; }
    main.innerHTML = '<div class="page"><p>Loading plan…</p></div>';
    const { data, error } = await sb.from('plans').select('*').eq('id', id).single();
    if (error || !data) { main.innerHTML = '<div class="page"><div class="card"><p>This plan was not found.</p><a class="btn" href="#/plans">My plans</a></div></div>'; return; }
    const names = window.DIALDRoster ? window.DIALDRoster.planNames() : {};
    A = { planId: data.id, planNumber: data.plan_number, title: data.title || '', localName: names[data.id] || '', inputs: data.inputs, ran: true, stage: 0, selected: data.pathway_ids || [], selectedTouched: true, progress: data.progress || [], dirty: false };
    persistA(); renderAnalyze();
  }

  /* ---------- MY PLANS ---------- */
  const planTitle = r => (r.title && r.title.trim()) || ('Plan ' + r.plan_number);
  // Plan names must not identify a student: no long numbers (IDs) and no names from a loaded file.
  function titleProblem(t) {
    if (t.length > 60) return 'Use 60 characters or fewer.';
    if (/\d{5,}/.test(t)) return 'This looks like a student ID. Use a description instead, like “Period 3 – reading”.';
    const names = (window.DIALDLocalNames && window.DIALDLocalNames()) || [];
    const low = t.toLowerCase();
    if (names.some(n => n.length > 2 && low.includes(n.toLowerCase()))) return 'This looks like a student’s name. Use a code or a description instead.';
    return '';
  }
  async function requireLogin(next) {
    if (!sb) { main.innerHTML = '<div class="page"><div class="card"><p>Accounts are not available right now. You can still use Learner Trajectory and the Library.</p></div></div>'; return false; }
    if (!user) { location.hash = '#/login?next=' + encodeURIComponent(next); return false; }
    return true;
  }

  async function plansPage() {
    if (!(await requireLogin('plans'))) return;
    main.innerHTML = '<div class="page"><p>Loading…</p></div>';
    let { data, error } = await sb.from('plans').select('id, plan_number, title, created_at, updated_at, result, pathway_ids, progress').order('plan_number', { ascending: false });
    if (error && /title/.test(error.message || '')) ({ data, error } = await sb.from('plans').select('id, plan_number, created_at, updated_at, result, pathway_ids, progress').order('plan_number', { ascending: false }));
    const rows = data || [];
    const localNames = window.DIALDRoster ? window.DIALDRoster.planNames() : {};
    main.innerHTML = `<div class="page">
      <div class="row" style="justify-content:space-between"><div><div class="eyebrow">Your workspace</div><h1>My plans</h1></div><a class="btn primary" href="#/analyze">+ New analysis</a></div>
      ${error ? `<div class="card"><p class="err">Could not load plans: ${esc(error.message)}</p></div>` : ''}
      <div class="card">${rows.length ? `<table class="tbl"><thead><tr><th>Plan</th><th>Quadrant</th><th>Signal</th><th>Pathways</th><th>Response</th><th>Updated</th><th></th></tr></thead><tbody>
        ${rows.map(r => { const resp = (r.progress || []).map(e => E.classifyResponse(e).level); return `<tr>
          <td class="plan-name"><a href="#/plan/${r.id}"><b>${esc(planTitle(r))}</b></a>${localNames[r.id] ? `<span class="local-name">${esc(localNames[r.id])}</span>` : ''} <button class="icon-btn" data-ren="${r.id}" data-t="${esc(r.title || '')}" data-n="${r.plan_number}" title="Rename" aria-label="Rename ${esc(planTitle(r))}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button></td>
          <td>${r.result && r.result.quadrant ? esc(r.result.quadrant) : '—'}</td>
          <td>${r.result ? `<span class="badge ${esc(r.result.risk)}" style="font-size:12px;padding:3px 8px">${esc(E.SIGNALS[r.result.risk] || r.result.risk)}</span>` : '—'}</td>
          <td>${(r.pathway_ids || []).map(id => pw(id) ? esc(pw(id).title) : '').filter(Boolean).join('<br>') || '—'}</td>
          <td>${resp.length ? resp.map(x => `<span class="badge ${x}" style="font-size:12px;padding:3px 8px">${x}</span>`).join(' ') : '—'}</td>
          <td class="small">${new Date(r.updated_at).toLocaleDateString()}</td>
          <td><button class="btn ghost danger" data-del="${r.id}" data-n="${r.plan_number}">Delete</button></td></tr>`; }).join('')}</tbody></table>`
        : '<p>No saved plans yet. Analyze a learner or a class in <a href="#/analyze">Learner Trajectory</a>, and choose “Save as a plan”.</p>'}</div>
      <p class="small">Plans store levels, results, and the pathways you chose. Never student names or IDs. ${Object.keys(localNames).length ? '🔒 Names next to a plan are kept only on this computer. <a href="#" id="keysheet">Download your key sheet</a> to keep a copy. ' : ''}Account options are in <a href="#/profile">Profile &amp; settings</a>.</p>
    </div>`;
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; return; }
      const { error: e } = await sb.from('plans').delete().eq('id', b.dataset.del);
      if (e) toast('Could not delete: ' + e.message); else { if (window.DIALDRoster) window.DIALDRoster.forgetPlanName(b.dataset.del); toast('Plan ' + b.dataset.n + ' deleted.'); if (A.planId === b.dataset.del) { A = freshA(); persistA(); } plansPage(); }
    });
    const ks = $('#keysheet'); if (ks) ks.onclick = e => { e.preventDefault(); window.DIALDRoster.keySheetCSV(); };
    $$('[data-ren]').forEach(b => b.onclick = () => {
      const cell = b.closest('td'), old = b.dataset.t;
      cell.innerHTML = `<form class="ren"><input maxlength="60" value="${esc(old)}" placeholder="Plan ${b.dataset.n}" aria-label="Plan name"><button class="btn primary" type="submit">Save</button><button class="btn ghost" type="button">Cancel</button><small class="err"></small></form>`;
      const f = cell.querySelector('form'), inp = f.querySelector('input'); inp.focus(); inp.select();
      f.querySelector('[type=button]').onclick = () => plansPage();
      f.onsubmit = async e => {
        e.preventDefault();
        const t = inp.value.trim(), bad = titleProblem(t);
        if (bad) { f.querySelector('small').textContent = bad; return; }
        const { error: er } = await sb.from('plans').update({ title: t || null }).eq('id', b.dataset.ren);
        if (er) { f.querySelector('small').textContent = /title/.test(er.message) ? 'Renaming needs a quick database update (see the setup notes).' : 'Could not rename: ' + er.message; return; }
        toast('Plan renamed.'); plansPage();
      };
    });
  }

  /* ---------- LIBRARY ---------- */
  const libF = { tab: 'pathways', quadrant: '', domain: '', grade: '', category: '' };
  function libraryPage(q) {
    if (q.get('tab')) libF.tab = q.get('tab') === 'activities' ? 'activities' : 'pathways';
    const sel = (id, label, pairs, cur) => `<div><label for="${id}">${label}</label><select id="${id}"><option value="">All</option>${opt(pairs, cur)}</select></div>`;
    const P = L.pathways.filter(p => (!libF.quadrant || p.quadrants.includes(libF.quadrant)) && (!libF.domain || p.domains.includes(libF.domain)) && (!libF.grade || p.grades.includes(libF.grade)));
    const Ac = L.activities.filter(a => (!libF.category || a.category === libF.category) && (!libF.domain || a.domains.includes(libF.domain)) && (!libF.grade || a.grades.includes(libF.grade)));
    main.innerHTML = `<div class="page">
      <div class="eyebrow">DIALD Intervention Library</div><h1>Library</h1>
      <p class="lead">Pathways are lesson-plan sequences for one skill (objectives, activities by phase, and a progress measure). Activities are the building blocks inside them, each with adaptations for levels 1–4.</p>
      <div class="privacy-note" style="margin:12px 0"><span aria-hidden="true">✏️</span><div><b>Early version.</b> Items marked “Sample content” show the structure and will be replaced by the author’s pathways.</div></div>
      <div class="tabs-inline"><a href="#/library?tab=pathways" class="${libF.tab === 'pathways' ? 'on' : ''}">Pathways (${L.pathways.length})</a><a href="#/library?tab=activities" class="${libF.tab === 'activities' ? 'on' : ''}">Activities (${L.activities.length})</a></div>
      <div class="filters">
        ${libF.tab === 'pathways' ? sel('f-q', 'Quadrant', Object.values(E.QUADRANTS).map(x => [x.id, x.id + ' · ' + x.name]), libF.quadrant) : sel('f-c', 'Category', Object.entries(L.CATEGORIES).map(([k, v]) => [k, v.name + ' (' + v.combo + ')']), libF.category)}
        ${sel('f-d', 'Domain', DOMAINS.map(d => [d, cap(d)]), libF.domain)}
        ${sel('f-g', 'Grade band', L.GRADES.map(g => [g, g]), libF.grade)}
      </div>
      <div class="grid2">${libF.tab === 'pathways'
        ? (P.map(p => `<a class="card lib-card" href="#/pathway/${p.id}"><h3>${esc(p.title)}</h3><div>${p.quadrants.map(quadChip).join('')}${domainChips(p.domains)}${sampleChip(p)}</div><p>${esc(p.summary)}</p><p class="small">${p.weeks} weeks · Grades ${p.grades.join(', ')}</p></a>`).join('') || '<p>No pathways match these filters.</p>')
        : (Ac.map(a => `<a class="card lib-card" href="#/activity/${a.id}"><h3>${esc(a.name)}</h3><div><span class="chip q">${esc(L.CATEGORIES[a.category].name)}</span>${domainChips(a.domains)}${sampleChip(a)}</div><p>${esc(a.studentsWill[0])}…</p><p class="small">${a.minutes} min · Grades ${a.grades.join(', ')}</p></a>`).join('') || '<p>No activities match these filters.</p>')}</div>
    </div>`;
    const bind = (id, key) => { const el = $('#' + id); if (el) el.onchange = () => { libF[key] = el.value; libraryPage(new URLSearchParams()); }; };
    bind('f-q', 'quadrant'); bind('f-c', 'category'); bind('f-d', 'domain'); bind('f-g', 'grade');
  }

  function pathwayPage(id) {
    const p = pw(id); if (!p) return notFound();
    main.innerHTML = `<div class="page">
      <a class="btn ghost" href="#/library">← Library</a>
      <div class="eyebrow" style="margin-top:12px">Pathway · ${p.weeks} weeks</div><h1>${esc(p.title)}</h1>
      <div>${p.quadrants.map(quadChip).join('')}${domainChips(p.domains)}<span class="chip">Grades ${p.grades.join(', ')}</span>${sampleChip(p)}</div>
      <p class="lead">${esc(p.summary)}</p>
      <div class="split"><div class="stack">
        <div class="card"><h3>Skill</h3><p>${esc(p.skill)}</p><h3>Objectives</h3><ul>${p.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>
        <div class="card"><h3>Sequence</h3>${p.phases.map(ph => `<div class="phase"><b>${esc(ph.name)}</b><div class="small">${esc(ph.focus)}</div><ul>${ph.activities.map(aid => act(aid) ? `<li><a href="#/activity/${aid}">${esc(act(aid).name)}</a></li>` : '').join('')}</ul></div>`).join('')}</div>
      </div><div class="stack">
        <div class="card"><h3>Progress monitoring</h3><p>${esc(p.monitoring.measure)}</p><p class="small">Example: baseline ${esc(p.monitoring.baseline)} → goal ${esc(p.monitoring.goal)}</p></div>
        <div class="card"><h3>Adapting the pathway</h3><ul class="small"><li><b>Positive:</b> keep it, then fade support.</li><li><b>Partial:</b> add modeling, practice, or time.</li><li><b>Limited:</b> check implementation, then consider another pathway.</li></ul></div>
        <div class="card"><h3>Download</h3><div id="dl"></div></div>
      </div></div></div>`;
    const dl = $('#dl');
    if (!p.pdf) dl.innerHTML = '<p class="small">PDF version coming soon.</p>';
    else if (!user) dl.innerHTML = `<a class="btn primary" href="#/login?next=${encodeURIComponent('pathway/' + p.id)}">Sign in to download the PDF</a>`;
    else {
      dl.innerHTML = '<button class="btn primary" id="get-pdf">Download PDF</button>';
      $('#get-pdf').onclick = async () => {
        const { data, error } = await sb.storage.from('library').createSignedUrl(p.pdf, 120, { download: true });
        if (error) toast('Download not available: ' + error.message); else location.href = data.signedUrl;
      };
    }
  }

  function activityPage(id, q) {
    const a = act(id); if (!a) return notFound();
    let lv = Math.max(1, Math.min(4, Number(q.get('level')) || 2));
    const render = () => {
      main.innerHTML = `<div class="page">
        <a class="btn ghost" href="#/library?tab=activities">← Activities</a>
        <div class="eyebrow" style="margin-top:12px">${esc(L.CATEGORIES[a.category].name)} · ${esc(L.CATEGORIES[a.category].combo)} · ${a.minutes} min</div>
        <h1>${esc(a.name)}</h1>
        <div>${domainChips(a.domains)}<span class="chip">Grades ${a.grades.join(', ')}</span>${sampleChip(a)}</div>
        <div class="split" style="margin-top:18px"><div class="stack">
          <div class="card"><h3>Students will</h3><ul>${a.studentsWill.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
            <h3>Steps</h3><ol>${a.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
          <div class="card"><h3>Adapt for proficiency level</h3>
            <div class="levelbar" role="group" aria-label="Proficiency level">${[1, 2, 3, 4].map(n => `<button data-lv="${n}" class="${n === lv ? 'on' : ''}" aria-pressed="${n === lv}">Level ${n}${n === 4 ? '+' : ''}</button>`).join('')}</div>
            <div class="adapt">${esc(a.adaptations[lv])}</div></div>
        </div><div class="stack">
          <div class="card"><h3>Sentence frames</h3><ul class="frames">${a.frames.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
          <div class="card"><h3>Quick check</h3><p>${esc(a.check)}</p><h3>Materials</h3><p>${esc(a.materials)}</p><p class="small">Credit: ${esc(a.credit)}</p></div>
          <div class="card"><h3>Used in pathways</h3><ul>${L.pathways.filter(p => p.phases.some(ph => ph.activities.includes(a.id))).map(p => `<li><a href="#/pathway/${p.id}">${esc(p.title)}</a></li>`).join('') || '<li>None yet</li>'}</ul></div>
        </div></div></div>`;
      $$('[data-lv]').forEach(b => b.onclick = () => { lv = Number(b.dataset.lv); history.replaceState(null, '', '#/activity/' + a.id + '?level=' + lv); render(); });
    };
    render();
  }

  /* ---------- AUTH ---------- */
  // Renders the sign-in / sign-up form inside `host`.
  function authForm(host, next, mode) {
    if (!sb) { host.innerHTML = '<p>Accounts are not available right now. Please try again later.</p>'; return; }
    const $h = s => host.querySelector(s);
    const render = () => {
      host.innerHTML = `
        <h2 class="auth-title">${mode === 'signup' ? 'Create your free account' : mode === 'forgot' ? 'Reset your password' : 'Sign in to DIALD'}</h2>
        <p class="small" style="margin:0 0 16px">${mode === 'forgot' ? 'We will email you a link to choose a new password.' : 'Free for educators. Use your school or personal email.'}</p>
        ${mode !== 'forgot' && googleEnabled ? `<button class="btn google" id="google" type="button"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>Continue with Google</button><div class="divider">or with email</div>` : ''}
        <form id="f" novalidate>
          <label for="email">Email</label><input id="email" type="email" autocomplete="email" required>
          ${mode !== 'forgot' ? `<label for="pw" style="margin-top:12px">Password</label><input id="pw" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="8" required>` : ''}
          ${mode === 'signup' ? `<label class="row agree"><input type="checkbox" id="agree"> <span class="small">I agree to the <a href="#/terms">Terms of use</a> and <a href="#/privacy">Privacy policy</a>. I will not enter student names or identifying information.</span></label>` : ''}
          <p id="msg" class="err" role="alert"></p>
          <button class="btn primary wide" type="submit">${mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</button>
        </form>
        <p class="small" style="margin:14px 0 0">${mode === 'signin' ? 'New here? <a href="#" data-m="signup">Create a free account</a> · <a href="#" data-m="forgot">Forgot password?</a>' : 'Already have an account? <a href="#" data-m="signin">Sign in</a>'}</p>`;
      host.querySelectorAll('[data-m]').forEach(l => l.onclick = e => { e.preventDefault(); mode = l.dataset.m; render(); });
      const g = $h('#google');
      if (g) g.onclick = async () => {
        store.set('diald-next', next);
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: baseUrl() } });
        if (error) $h('#msg').textContent = error.message;
      };
      $h('#f').onsubmit = async e => {
        e.preventDefault();
        const msg = $h('#msg'); msg.className = 'err'; msg.textContent = '';
        const email = $h('#email').value.trim(), pass = $h('#pw') ? $h('#pw').value : '';
        if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Enter a valid email.'; return; }
        if (mode !== 'forgot' && pass.length < 8) { msg.textContent = 'Use a password with at least 8 characters.'; return; }
        if (mode === 'signup' && !$h('#agree').checked) { msg.textContent = 'Please accept the terms to continue.'; return; }
        const btn = host.querySelector('button[type=submit]'); btn.disabled = true;
        let r;
        if (mode === 'signin') r = await sb.auth.signInWithPassword({ email, password: pass });
        else if (mode === 'signup') { store.set('diald-next', next); r = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: baseUrl() } }); }
        else { store.set('diald-next', 'reset'); r = await sb.auth.resetPasswordForEmail(email, { redirectTo: baseUrl() }); }
        btn.disabled = false;
        if (r.error) { msg.textContent = r.error.message; return; }
        if (mode === 'signin') { toast('Welcome back.'); location.hash = '#/' + next; }
        else if (mode === 'signup' && r.data && r.data.session) { toast('Account created.'); location.hash = '#/' + next; }
        else { msg.className = 'ok'; msg.textContent = mode === 'signup' ? 'Check your email to confirm your account, then sign in here.' : 'If that email has an account, a reset link is on its way.'; }
      };
    };
    host._setMode = m => { if (m !== mode) { mode = m; render(); } };
    render();
  }

  // #/login shows the public landing page with the form open in the requested mode.
  function loginPage(q) {
    const next = q.get('next') || 'home';
    if (user) { location.hash = '#/' + (next === 'home' ? '' : next); return; }
    landing(next, q.get('mode') === 'signup' ? 'signup' : 'signin');
  }

  function resetPage() {
    if (!user) { main.innerHTML = '<div class="page"><div class="card auth"><p>Open the reset link from your email to set a new password.</p><a class="btn" href="#/login">Sign in</a></div></div>'; return; }
    main.innerHTML = `<div class="page"><div class="card auth"><h1 style="font-size:30px">Set a new password</h1>
      <form id="f"><label for="pw">New password</label><input id="pw" type="password" minlength="8" autocomplete="new-password" required><p id="msg" class="err" role="alert"></p>
      <button class="btn primary" type="submit">Save password</button></form></div></div>`;
    $('#f').onsubmit = async e => {
      e.preventDefault(); const p = $('#pw').value;
      if (p.length < 8) { $('#msg').textContent = 'Use at least 8 characters.'; return; }
      const { error } = await sb.auth.updateUser({ password: p });
      if (error) $('#msg').textContent = error.message; else { toast('Password updated.'); location.hash = '#/plans'; }
    };
  }

  /* ---------- TEACHER PROFILE ---------- */
  const ROLES = ['ESOL / TESOL / ELD teacher', 'Bilingual / dual language teacher', 'ELA teacher', 'Content-area teacher (math, science, social studies)', 'Special education teacher', 'Reading / literacy specialist', 'Instructional coach', 'School or district administrator', 'Higher education / researcher', 'Other'];
  const GRADE_BANDS = ['PreK', 'K-2', '3-5', '6-8', '9-12', 'Adult'];
  const STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'Outside the United States'];

  async function loadProfile() {
    profile = null; profileLoaded = false;
    if (!sb || !user) return;
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) { console.warn('profile', error); profileLoaded = false; return; } // table missing: do not block the site
    profile = data; profileLoaded = true;
  }

  async function profilePage(q) {
    if (!(await requireLogin('profile'))) return;
    const next = q.get('next') || 'plans';
    const first = !profile;
    const meta = user.user_metadata || {};
    const P = profile || { full_name: meta.full_name || meta.name || '', district: '', state: 'Connecticut', grades: [], role: '' };
    main.innerHTML = `<div class="page"><div class="card auth" style="max-width:560px">
      <div class="eyebrow">${first ? 'Teacher profile' : 'Profile &amp; settings'}</div>
      <h1 style="font-size:30px">${first ? 'Tell us about you' : 'Your profile'}</h1>
      <p class="small">${first ? 'One last step. ' : ''}This is information about <b>you</b>, the educator. It helps us understand where DIALD is used. Never enter student information.</p>
      <form id="pf" novalidate>
        <label for="pf-name">Full name</label><input id="pf-name" maxlength="120" autocomplete="name" value="${esc(P.full_name)}" required>
        <label for="pf-district" style="margin-top:12px">School district or organization</label><input id="pf-district" maxlength="160" autocomplete="organization" value="${esc(P.district)}" placeholder="e.g. Hartford Public Schools" required>
        <label for="pf-state" style="margin-top:12px">State</label><select id="pf-state">${STATES.map(s => `<option ${P.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <label for="pf-role" style="margin-top:12px">Your role</label><select id="pf-role"><option value="">Choose one</option>${ROLES.map(r => `<option ${P.role === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
        <fieldset style="border:0;padding:0;margin:14px 0 0"><legend style="font-size:13px;font-weight:700;margin-bottom:6px">Grades you usually teach</legend>
          <div class="row">${GRADE_BANDS.map(g => `<label class="row" style="font-weight:400;gap:6px;margin:0 10px 0 0"><input type="checkbox" style="width:auto" name="pf-g" value="${g}" ${(P.grades || []).includes(g) ? 'checked' : ''}> ${g}</label>`).join('')}</div>
        </fieldset>
        <p id="pf-msg" class="err" role="alert"></p>
        <button class="btn primary" type="submit">${first ? 'Save and continue' : 'Save profile'}</button>
        ${first ? '' : '<a class="btn ghost" href="#/plans">Cancel</a>'}
      </form></div>
      ${first ? '' : `<div class="card auth settings" style="max-width:560px">
        <h2>Account</h2>
        <p class="small" style="margin-top:0">Signed in as <b>${esc(user.email)}</b>. DIALD stores your account, this profile, and your saved plans. It never stores student names or IDs.</p>
        <button class="btn" id="out" type="button">Sign out</button>
        <details class="danger-zone"><summary>Delete account</summary>
          <p>This permanently deletes your account, your profile, and <b>all your saved plans</b>. It cannot be undone.</p>
          <label for="del-word">Type <b>DELETE</b> to confirm</label>
          <input id="del-word" autocomplete="off" spellcheck="false">
          <button class="btn danger-solid" id="delacct" type="button" disabled>Delete my account and all plans</button>
          <p id="del-msg" class="err"></p>
        </details>
      </div>`}
      </div>`;
    if (!first) {
      $('#out').onclick = async () => { await sb.auth.signOut(); location.hash = '#/'; };
      $('#del-word').oninput = e => { $('#delacct').disabled = e.target.value.trim() !== 'DELETE'; };
      $('#delacct').onclick = async () => {
        if ($('#del-word').value.trim() !== 'DELETE') return;
        $('#delacct').disabled = true;
        const { error: er } = await sb.rpc('delete_my_account');
        if (er) { $('#del-msg').textContent = 'Could not delete the account: ' + er.message; $('#delacct').disabled = false; return; }
        await sb.auth.signOut(); A = freshA(); persistA(); toast('Your account and plans were deleted.'); location.hash = '#/';
      };
    }
    $('#pf').onsubmit = async e => {
      e.preventDefault();
      const row = {
        user_id: user.id,
        full_name: $('#pf-name').value.trim(), district: $('#pf-district').value.trim(), state: $('#pf-state').value,
        role: $('#pf-role').value, grades: $$('[name=pf-g]').filter(x => x.checked).map(x => x.value)
      };
      const msg = $('#pf-msg');
      if (row.full_name.length < 2) { msg.textContent = 'Please enter your name.'; return; }
      if (row.district.length < 2) { msg.textContent = 'Please enter your school district or organization.'; return; }
      if (!row.role) { msg.textContent = 'Please choose your role.'; return; }
      if (!row.grades.length) { msg.textContent = 'Choose at least one grade band.'; return; }
      const btn = main.querySelector('button[type=submit]'); btn.disabled = true;
      const { data, error } = await sb.from('profiles').upsert(row).select('*').single();
      btn.disabled = false;
      if (error) { msg.textContent = 'Could not save: ' + error.message; return; }
      profile = data; profileLoaded = true; renderAcct();
      toast(first ? 'Welcome to DIALD, ' + profile.full_name.split(' ')[0] + '!' : 'Profile saved.');
      location.hash = '#/' + next.replace(/^#?\/?/, '');
    };
  }

  /* ---------- static pages ---------- */
  const contact = () => C.contactEmail ? `<a href="mailto:${esc(C.contactEmail)}">${esc(C.contactEmail)}</a>` : 'the contact email shown on this site';
  function privacyPage() {
    main.innerHTML = `<div class="page prose"><div class="eyebrow">Last updated October 2026</div><h1>Privacy policy</h1>
      <p class="lead">DIALD is built so that teachers can use it without sharing any student information.</p>
      <h2>What we store</h2><ul><li>Your email address and password (managed securely by our authentication provider), or your Google sign-in.</li><li>Your teacher profile: your name, school district, state, the grades you teach, and your role.</li><li>Plans you choose to save: proficiency levels and scale scores, test year labels, grade band and grade for each year, years of services, general academic and response categories, the pathways you selected, and progress numbers.</li></ul>
      <h2>What we do not store</h2><ul><li>Student names, IDs, dates of birth, schools, or any other information that identifies a student.</li><li>Free-text notes about students. The tool has no free-text fields for student information.</li></ul>
      <p>Please do not enter identifying information anywhere on this site.</p>
      <h2>Explain with AI</h2><p>If you choose <b>Explain with AI</b>, DIALD sends the learner’s levels, test year labels, grade band, years of services, and results — never names or IDs — to Cloudflare Workers AI, which writes the explanation. For <b>Class ideas with AI</b>, it sends only counts for the group (for example, how many students are in each profile). Cloudflare does not use this data to train its models. Each teacher can use it 20 times a day; DIALD stores only how many times you used it today.</p>
            <h2>Files you analyze</h2><p>When you use <b>Analyze my file</b>, your file is read <b>inside your browser, on your computer</b>. It is not uploaded, and student names and IDs are never sent to our servers. If you choose “Keep this file on this computer,” it is kept in your browser’s storage until you clear it. Otherwise it is forgotten when you close the tab.</p>
      <p>If you save a plan for a student from your file, only the allowed fields are saved: levels, scale scores, test year labels, grade band and grade for each year, years of services, results, chosen pathways, and progress numbers. The student’s name stays on your computer, linked to the plan, so you can recognize it. Our database also rejects any field that is not on this list.</p>
      <h2>How we use data</h2><p>To run the site: to let you sign in, save, and reopen your plans. Your teacher profile also helps the author understand where and how DIALD is used (for example, how many teachers use it by state, grade, or role). Results are reported only in summary form, never by name. We do not sell, rent, or share your data, and we do not use it for advertising.</p>
      <h2>Who can see your plans</h2><p>Only you. Database rules allow each account to read and change its own plans only.</p>
      <h2>Where data is stored</h2><p>On servers in the United States operated by our database provider (Supabase).</p>
      <h2>Delete your data</h2><p>You can delete any plan from <a href="#/plans">My plans</a>, or your whole account and all plans from <a href="#/profile">Profile &amp; settings</a>. To remove a file from this computer, choose “Clear file” on your dashboard.</p>
      <h2>Contact</h2><p>Questions: ${contact()}.</p></div>`;
  }
  function termsPage() {
    main.innerHTML = `<div class="page prose"><div class="eyebrow">Last updated October 2026</div><h1>Terms of use</h1>
      <h2>Purpose</h2><p>DIALD is an emerging framework for educators. Its results are provisional and are meant for educator review. They are not diagnoses, and they do not assign MTSS tiers, special education referrals, or placements.</p>
      <h2>No student information</h2><p>You agree not to enter student names, IDs, or any information that could identify a student.</p>
      <h2>Library materials</h2><p>© Darlin Cortico Rosario. Library materials may be used and shared for non-commercial educational purposes with credit to the author, without changes, under a Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 license (CC BY-NC-ND 4.0). Strategies credited to other authors remain theirs.</p>
      <h2>No warranty</h2><p>The site is provided as is, while the framework is still under development and validation.</p>
      <h2>Contact</h2><p>Questions: ${contact()}.</p></div>`;
  }
  function notFound() { main.innerHTML = '<div class="page"><div class="card"><h2>Page not found</h2><a class="btn" href="#/">Home</a></div></div>'; }

  /* ---------- start ---------- */
  document.getElementById('yr').textContent = new Date().getFullYear();
  async function start() {
    if (sb) {
      const params = new URLSearchParams(location.search);
      const fromAuth = params.has('code') || params.has('error') || params.has('error_description');
      try { const { data } = await sb.auth.getSession(); user = data.session ? data.session.user : null; } catch (e) { console.warn(e); }
      await loadProfile();
      // Show "Continue with Google" only when Google is turned on in Supabase.
      fetch(C.supabaseUrl + '/auth/v1/settings', { headers: { apikey: C.supabaseKey } })
        .then(r => r.json()).then(s => { googleEnabled = !!(s && s.external && s.external.google); if (googleEnabled && !user && ['', 'login'].includes(parseHash().parts[0] || '')) route(); })
        .catch(() => { googleEnabled = false; });
      if (fromAuth) {
        if (params.get('error_description')) toast(params.get('error_description'));
        const next = store.get('diald-next') || ''; store.del('diald-next');
        history.replaceState(null, '', location.pathname + '#/' + next);
      }
      sb.auth.onAuthStateChange((event, s) => {
        const was = !!user; user = s ? s.user : null; renderAcct();
        if (window.DIALDHelp) window.DIALDHelp.setUser(user);
        if (event === 'PASSWORD_RECOVERY') { location.hash = '#/reset'; return; }
        if (was !== !!user) {
          // Supabase advises not awaiting inside this callback; load the profile afterwards.
          setTimeout(async () => {
            await loadProfile(); renderAcct();
            const p = parseHash().parts[0] || '';
            if (!user || ['plans', 'plan', 'analyze', 'learner', 'class', 'pathway', 'login', 'profile'].includes(p) || (profileLoaded && !profile)) route();
          }, 0);
        }
      });
    }
    renderAcct(); route();
    if (window.DIALDHelp) { window.DIALDHelp.setUser(user); window.DIALDHelp.mountFeedback(); }
  }
  start();

  /* ---------- sign out after 30 minutes without activity (warning at 28) ---------- */
  (function idleGuard() {
    const LIMIT = 30 * 60e3, WARN = 28 * 60e3;
    let last = Date.now(), warned = null;
    const bump = () => { last = Date.now(); if (warned) { warned.remove(); warned = null; } };
    ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(ev => window.addEventListener(ev, bump, { passive: true }));
    setInterval(async () => {
      if (!user || !sb) return;
      const idle = Date.now() - last;
      if (idle >= LIMIT) {
        if (warned) { warned.remove(); warned = null; }
        await sb.auth.signOut(); toast('You were signed out after 30 minutes without activity.'); location.hash = '#/';
      } else if (idle >= WARN && !warned) {
        warned = document.createElement('div'); warned.className = 'idle-warn'; warned.setAttribute('role', 'alertdialog');
        warned.innerHTML = '<b>Are you still there?</b><p>For security, DIALD will sign you out in 2 minutes.</p><button class="btn primary" type="button">Stay signed in</button>';
        warned.querySelector('button').onclick = bump; document.body.appendChild(warned);
      }
    }, 15e3);
  })();
})();
