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
  const statusChip = s => s === 'concern' ? '<span class="chip bad">Concern</span>' : s === 'no-concern' ? '<span class="chip good">No current concern</span>' : '<span class="chip na">Insufficient evidence</span>';
  const sampleChip = x => x.status === 'sample' ? '<span class="chip sample">Sample content</span>' : '';

  /* ---------- Supabase ---------- */
  let sb = null, user = null, profile = null, profileLoaded = false, googleEnabled = false;
  try {
    if (window.supabase && C.supabaseUrl && C.supabaseKey) {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
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
    if (user && profileLoaded && !profile && !['profile', 'privacy', 'terms', 'reset', 'login'].includes(p)) {
      const here = location.hash.replace(/^#\/?/, '') || 'plans';
      location.hash = '#/profile?next=' + encodeURIComponent(here);
      return;
    }
    if (p === 'home') { location.hash = '#/'; return; }
    document.body.classList.toggle('public', !user);
    // Everything except the landing, account and policy pages needs a free account.
    if (sb && !user && !['', 'login', 'reset', 'privacy', 'terms'].includes(p)) {
      const here = location.hash.replace(/^#\/?/, '');
      location.hash = '#/login?next=' + encodeURIComponent(here);
      return;
    }
    const map = { '': 'home', analyze: 'analyze', plan: 'plans', library: 'library', pathway: 'library', activity: 'library', plans: 'plans' };
    setNav(map[p] || '');
    if (p === 'profile') profilePage(q);
    else if (p === '') home();
    else if (p === 'analyze') analyzePage(q);
    else if (p === 'library') libraryPage(q);
    else if (p === 'pathway') pathwayPage(parts[1]);
    else if (p === 'activity') activityPage(parts[1], q);
    else if (p === 'plans') plansPage();
    else if (p === 'plan') openPlan(parts[1]);
    else if (p === 'login') loginPage(q);
    else if (p === 'reset') resetPage();
    else if (p === 'privacy') privacyPage();
    else if (p === 'terms') termsPage();
    else notFound();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- header account area ---------- */
  function renderAcct() {
    const html = user
      ? `<a href="#/profile" style="color:inherit;text-decoration:none" title="Edit profile">${esc((profile && profile.full_name) || user.email || 'Signed in')}</a><button class="btn" id="signout">Sign out</button>`
      : `<a class="btn" href="#/login">Sign in</a><a class="btn primary" href="#/login?mode=signup">Create account</a>`;
    document.getElementById('acct').innerHTML = html;
    document.getElementById('acct-m').innerHTML = user ? `<a href="#" id="signout-m">Sign out</a>` : `<a href="#/login">Sign in</a>`;
    const so = async e => { e.preventDefault(); await sb.auth.signOut(); toast('Signed out.'); location.hash = '#/'; };
    const b1 = document.getElementById('signout'), b2 = document.getElementById('signout-m');
    if (b1) b1.onclick = so; if (b2) b2.onclick = so;
  }
  document.getElementById('menu-btn').onclick = () => {
    const n = document.getElementById('nav'); n.classList.toggle('open');
    document.getElementById('menu-btn').setAttribute('aria-expanded', n.classList.contains('open'));
  };

  /* ---------- HOME ---------- */
  const CYCLE = [
    ['Profile', 'Enter each year’s Listening, Speaking, Reading, and Writing levels. Levels only — never names.'],
    ['Pattern Indicator', 'See the learner’s quadrant, whether oral language and literacy move apart, and a provisional LTEL trajectory risk.'],
    ['Instructional Focus', 'Get lesson-plan pathways from the DIALD Library that match the learner’s priorities.'],
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
    const n = CYCLE.length, C = 200, RO = 194, RI = 104, RM = 149, step = 2 * Math.PI / n;
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
      const mx = C + RM * Math.cos(am), my = C + RM * Math.sin(am);
      const words = t.split(' ');
      const label = words.length > 1
        ? `<text x="${mx}" y="${my + 22}">${esc(words[0])}</text><text x="${mx}" y="${my + 37}">${esc(words.slice(1).join(' '))}</text>`
        : `<text x="${mx}" y="${my + 26}">${esc(t)}</text>`;
      return `<g class="seg" data-node="${i}" role="button" tabindex="0" aria-pressed="false" aria-label="Stage ${i + 1}: ${esc(t)}"
          style="--dx:${(9 * Math.cos(am)).toFixed(2)}px;--dy:${(9 * Math.sin(am)).toFixed(2)}px;--d:${i * 90}ms;color:${L.t}">
        <path d="${d}" fill="${L.c}"/>
        <text class="num" x="${mx}" y="${my - 30}">${i + 1}</text>
        <svg x="${mx - 15}" y="${my - 22}" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${L.i}</svg>
        ${label}
      </g>`;
    }).join('');
    return `<div class="cycle-wrap">
      <div class="wheel" id="${id}">
        <svg class="wheel-art" viewBox="0 0 400 400" aria-label="The DIALD cycle: five stages">${segs}</svg>
        <div class="wheel-center" aria-live="polite">
          <small id="${id}-n">The DIALD cycle</small>
          <b id="${id}-t">Five stages</b>
          <p id="${id}-d">Choose a stage to see what happens in it.</p>
        </div>
      </div>
      <div class="ring-desc" aria-hidden="true"><b id="${id}-t2">The DIALD cycle</b><p id="${id}-d2">Tap a stage to see what happens in it.</p></div>
    </div>`;
  }
  function bindCycle(id) {
    const box = document.getElementById(id); if (!box) return;
    const segs = [...box.querySelectorAll('[data-node]')];
    const set = (k, v) => { const el = document.getElementById(id + k); if (el) el.textContent = v; };
    segs.forEach(g => {
      const pick = () => {
        segs.forEach(x => { x.classList.toggle('on', x === g); x.setAttribute('aria-pressed', x === g); });
        const k = Number(g.dataset.node), [t, d] = CYCLE[k];
        box.style.setProperty('--accent', STAGE_LOOK[k].c);
        set('-n', 'Stage ' + (k + 1) + ' of 5'); set('-t', t); set('-d', d);
        set('-t2', (k + 1) + ' · ' + t); set('-d2', d);
      };
      g.onclick = pick; g.onmouseenter = pick; g.onfocus = pick;
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    });
    // Segments appear one after another when the wheel scrolls into view.
    if ('IntersectionObserver' in window) {
      box.classList.add('pre');
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { box.classList.remove('pre'); box.classList.add('in'); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(box);
    }
  }

  function home() { if (user) welcomeHome(); else landing('home', 'signin'); }

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
              <a class="action" href="#/analyze?new=1"><b>Find supports</b><span>Enter a learner’s levels and get matching pathways.</span><i aria-hidden="true">→</i></a>
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
      history.replaceState(null, '', '#/analyze'); setNav('analyze');
    } else if (q.get('new') === '1') {
      A = freshA(); persistA(); history.replaceState(null, '', '#/analyze');
    } else if (A.planId && !q.get('keep')) {
      // leaving a saved plan: start fresh
      A = freshA(); persistA();
    }
    renderAnalyze();
  }

  function renderAnalyze() {
    const res = result();
    if (!res && A.stage > 0) A.stage = 0;
    const title = A.planId ? 'Plan ' + A.planNumber : 'Find supports';
    main.innerHTML = `<div class="page">
      <div class="row" style="justify-content:space-between">
        <div><div class="eyebrow">${A.planId ? 'Saved plan' : 'DIALD analysis'}${A.sample ? ' · Sample case (fictional)' : ''}</div><h1 style="margin-bottom:4px">${esc(title)}</h1>
        <p class="small" style="margin:0">Levels only. No names, IDs, or details that identify a student.</p></div>
        <div class="row">${A.planId ? '<a class="btn" href="#/plans">← My plans</a>' : ''}<a class="btn" href="#/analyze?new=1">Start new</a>${!A.planId ? '<a class="btn" href="#/analyze?sample=ana">Load sample case</a>' : ''}</div>
      </div>
      <div class="stages" role="tablist">${STAGES.map((s, i) => `<button role="tab" data-stage="${i}" class="${A.stage === i ? 'on' : ''}" ${i > 0 && !res ? 'disabled' : ''} aria-selected="${A.stage === i}"><span>0${i + 1}</span>${s}</button>`).join('')}</div>
      <div id="stage"></div>
    </div>
    <div class="savebar" id="savebar"></div>`;
    $$('[data-stage]').forEach(b => b.onclick = () => { if (A.stage === 0) readProfile(); A.stage = Number(b.dataset.stage); persistA(); renderAnalyze(); });
    [profileStage, patternStage, focusStage, responseStage, adaptationStage][A.stage](res);
    renderSaveBar(res);
  }

  function levelSelect(pi, d, v) {
    const opts = ['<option value="">—</option>'].concat(Array.from({ length: C.maxLevel }, (_, i) => `<option ${v === i + 1 ? 'selected' : ''}>${i + 1}</option>`));
    return `<select id="lv-${pi}-${d}" aria-label="${esc(A.inputs.periods[pi].label)} ${d}">${opts.join('')}</select>`;
  }

  function profileStage() {
    const I = A.inputs;
    $('#stage').innerHTML = `<div class="split">
      <div class="card">
        <div class="eyebrow">01 · Profile</div>
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
        <button class="btn primary" id="run">See the pattern →</button>
      </div>
      <div class="stack">
        <div class="privacy-note"><span aria-hidden="true">🔒</span><div><b>Do not enter student names or IDs.</b> This tool works with levels only. If you save a plan, it is named “Plan 1, Plan 2…” automatically.</div></div>
        <div class="card"><h3>Reference level</h3>
          <p class="small">Oral (Listening + Speaking) or Literacy (Reading + Writing) counts as <b>High</b> when both domains are at or above this level. This is a provisional criterion; adjust it to your assessment.</p>
          <label for="high">High = level</label><select id="high">${Array.from({ length: C.maxLevel - 1 }, (_, i) => `<option ${I.highLevel === i + 2 ? 'selected' : ''} value="${i + 2}">${i + 2} or above</option>`).join('')}</select>
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
      A.ran = true; A.dirty = true; A.stage = 1; persistA(); renderAnalyze();
    };
    main.querySelectorAll('#stage select, #stage input').forEach(el => el.addEventListener('change', () => { readProfile(); A.dirty = true; persistA(); renderSaveBar(result()); }));
  }
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
    // drop empty rows at the end only when analysing
    I.periods = I.periods.filter((p, i) => i < 1 || DOMAINS.some(d => p[d]) || i < I.periods.length);
  }

  function patternStage(res) {
    const r = res.risk;
    $('#stage').innerHTML = `<div class="split">
      <div class="stack">
        <div class="card">
          <div class="eyebrow">02 · Pattern Indicator</div>
          <h2>Provisional LTEL trajectory risk</h2>
          <div class="row" style="margin:6px 0 10px"><span class="badge ${r.level}">${r.level === 'Inconclusive' ? 'Inconclusive' : r.level + ' risk'}</span>${res.quadrant ? quadChip(res.quadrant.id) : ''}</div>
          <p>${esc(r.text)}</p>
          <p class="small">Risk here is theoretical, not statistical: it reflects patterns described among students classified as LTELs, not a probability. Review the learner’s context before acting. DIALD does not assign MTSS tiers or referrals.</p>
        </div>
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
      <div class="card"><h3>Back to the Profile</h3><p>When the next assessment results arrive, add them as a new year. DIALD will reassess the pattern and the provisional risk.</p>
        <button class="btn" id="next-cycle">+ Add next year’s levels</button></div>`;
    $('#next-cycle').onclick = () => { A.inputs.periods.push(blankPeriod(A.inputs.periods.length + 1)); A.stage = 0; A.dirty = true; persistA(); renderAnalyze(); };
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
      inputs: A.inputs,
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
    toast('Plan ' + A.planNumber + ' saved.');
    history.replaceState(null, '', '#/plan/' + A.planId); setNav('plans');
    renderAnalyze();
  }
  function saveError(err) { console.error(err); toast('Could not save: ' + (err.message || 'try again')); renderSaveBar(result()); }

  async function openPlan(id) {
    if (!(await requireLogin('plans'))) return;
    if (A.planId === id && A.ran) { renderAnalyze(); return; }
    main.innerHTML = '<div class="page"><p>Loading plan…</p></div>';
    const { data, error } = await sb.from('plans').select('*').eq('id', id).single();
    if (error || !data) { main.innerHTML = '<div class="page"><div class="card"><p>This plan was not found.</p><a class="btn" href="#/plans">My plans</a></div></div>'; return; }
    A = { planId: data.id, planNumber: data.plan_number, inputs: data.inputs, ran: true, stage: 1, selected: data.pathway_ids || [], selectedTouched: true, progress: data.progress || [], dirty: false };
    persistA(); renderAnalyze();
  }

  /* ---------- MY PLANS ---------- */
  async function requireLogin(next) {
    if (!sb) { main.innerHTML = '<div class="page"><div class="card"><p>Accounts are not available right now. You can still use Find supports and the Library.</p></div></div>'; return false; }
    if (!user) { location.hash = '#/login?next=' + encodeURIComponent(next); return false; }
    return true;
  }

  async function plansPage() {
    if (!(await requireLogin('plans'))) return;
    main.innerHTML = '<div class="page"><p>Loading…</p></div>';
    const { data, error } = await sb.from('plans').select('id, plan_number, created_at, updated_at, result, pathway_ids, progress').order('plan_number', { ascending: false });
    const rows = data || [];
    main.innerHTML = `<div class="page">
      <div class="row" style="justify-content:space-between"><div><div class="eyebrow">Your workspace</div><h1>My plans</h1></div><a class="btn primary" href="#/analyze?new=1">+ New analysis</a></div>
      ${error ? `<div class="card"><p class="err">Could not load plans: ${esc(error.message)}</p></div>` : ''}
      <div class="card">${rows.length ? `<table class="tbl"><thead><tr><th>Plan</th><th>Quadrant</th><th>Risk</th><th>Pathways</th><th>Response</th><th>Updated</th><th></th></tr></thead><tbody>
        ${rows.map(r => { const resp = (r.progress || []).map(e => E.classifyResponse(e).level); return `<tr>
          <td><a href="#/plan/${r.id}"><b>Plan ${r.plan_number}</b></a></td>
          <td>${r.result && r.result.quadrant ? esc(r.result.quadrant) : '—'}</td>
          <td>${r.result ? `<span class="badge ${esc(r.result.risk)}" style="font-size:12px;padding:3px 8px">${esc(r.result.risk)}</span>` : '—'}</td>
          <td>${(r.pathway_ids || []).map(id => pw(id) ? esc(pw(id).title) : '').filter(Boolean).join('<br>') || '—'}</td>
          <td>${resp.length ? resp.map(x => `<span class="badge ${x}" style="font-size:12px;padding:3px 8px">${x}</span>`).join(' ') : '—'}</td>
          <td class="small">${new Date(r.updated_at).toLocaleDateString()}</td>
          <td><button class="btn ghost danger" data-del="${r.id}" data-n="${r.plan_number}">Delete</button></td></tr>`; }).join('')}</tbody></table>`
        : '<p>No saved plans yet. Run an analysis in <a href="#/analyze">Find supports</a> and choose “Save as a plan”.</p>'}</div>
      <div class="card"><h3>Account</h3>
        ${profile ? `<p style="margin:0">${esc(profile.full_name)} · ${esc(profile.role)}<br><span class="small">${esc(profile.district)}, ${esc(profile.state)} · Grades ${esc((profile.grades || []).join(', '))}</span></p><p><a href="#/profile">Edit profile</a></p>` : ''}
        <p class="small">Signed in as ${esc(user.email)}. DIALD stores your account, your teacher profile, and your saved plans. It never stores student information.</p>
        <div class="row"><button class="btn" id="out">Sign out</button><button class="btn danger" id="delacct">Delete my account and all plans</button></div><p id="del-msg" class="err"></p></div>
    </div>`;
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; return; }
      const { error: e } = await sb.from('plans').delete().eq('id', b.dataset.del);
      if (e) toast('Could not delete: ' + e.message); else { toast('Plan ' + b.dataset.n + ' deleted.'); if (A.planId === b.dataset.del) { A = freshA(); persistA(); } plansPage(); }
    });
    $('#out').onclick = async () => { await sb.auth.signOut(); location.hash = '#/'; };
    $('#delacct').onclick = async () => {
      const b = $('#delacct');
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click again: this cannot be undone'; return; }
      const { error: e } = await sb.rpc('delete_my_account');
      if (e) { $('#del-msg').textContent = 'Could not delete the account: ' + e.message; return; }
      await sb.auth.signOut(); A = freshA(); persistA(); toast('Your account and plans were deleted.'); location.hash = '#/';
    };
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
      <div class="eyebrow">Teacher profile</div>
      <h1 style="font-size:30px">${first ? 'Tell us about you' : 'Edit your profile'}</h1>
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
      </form></div></div>`;
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
      <h2>What we store</h2><ul><li>Your email address and password (managed securely by our authentication provider), or your Google sign-in.</li><li>Your teacher profile: your name, school district, state, the grades you teach, and your role.</li><li>Plans you choose to save: proficiency levels, years of services, general academic and response categories, the pathways you selected, and progress numbers.</li></ul>
      <h2>What we do not store</h2><ul><li>Student names, IDs, dates of birth, schools, or any other information that identifies a student.</li><li>Free-text notes about students. The tool has no free-text fields for student information.</li></ul>
      <p>Please do not enter identifying information anywhere on this site.</p>
      <h2>Without an account</h2><p>You can use Find supports and the Library without an account. What you enter stays in your browser tab and is not sent to our servers.</p>
      <h2>How we use data</h2><p>To run the site: to let you sign in, save, and reopen your plans. Your teacher profile also helps the author understand where and how DIALD is used (for example, how many teachers use it by state, grade, or role). Results are reported only in summary form, never by name. We do not sell, rent, or share your data, and we do not use it for advertising.</p>
      <h2>Who can see your plans</h2><p>Only you. Database rules allow each account to read and change its own plans only.</p>
      <h2>Where data is stored</h2><p>On servers in the United States operated by our database provider (Supabase).</p>
      <h2>Delete your data</h2><p>You can delete any plan, or your whole account and all plans, at any time from <a href="#/plans">My plans</a>.</p>
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
        if (event === 'PASSWORD_RECOVERY') { location.hash = '#/reset'; return; }
        if (was !== !!user) {
          // Supabase advises not awaiting inside this callback; load the profile afterwards.
          setTimeout(async () => {
            await loadProfile(); renderAcct();
            const p = parseHash().parts[0] || '';
            if (!user || ['plans', 'plan', 'analyze', 'pathway', 'login', 'profile'].includes(p) || (profileLoaded && !profile)) route();
          }, 0);
        }
      });
    }
    renderAcct(); route();
  }
  start();
})();
