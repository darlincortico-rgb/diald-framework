/* DIALD Library pages and the public "DIALD cycle" page.
   Every card has a picture: the site first tries library-img/<key>.jpg (Darlin's own images);
   if that file is not there yet, a DIALD-colored illustration is shown instead. */
(function () {
  'use strict';
  const L = window.DIALDLibrary, E = window.DIALDEngine;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- pictures ---------- */
  const PAL = [['#1B3A5C', '#2C6E91'], ['#2A9488', '#1f7a70'], ['#E3A93B', '#c98f22'], ['#C8673F', '#a8532f'], ['#2C6E91', '#1B3A5C'], ['#5FB3A8', '#2A9488']];
  const ICON = {
    lessons: '<path d="M4 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z"/>',
    activities: '<path d="M9 3h6v4a2 2 0 1 1 0 4v4H9v-4a2 2 0 1 0 0-4z"/><path d="M5 15h14v6H5z"/>',
    stages: '<path d="M3 20h5v-5h5v-5h5V5h3"/><path d="M3 20h18"/>',
    cycle: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/><path d="M20 12l-2-2M20 12l2-2"/>',
    pushin: '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2.5 20c.8-3.5 3-5.5 5.5-5.5s4.7 2 5.5 5.5M13.5 19c.5-2.5 1.9-4 3.5-4s3 1.5 3.5 4"/>',
    iep: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    talk: '<path d="M4 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M18 9h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3l-4-3h-4"/>',
    reading: '<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0z"/><path d="M21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>',
    writing: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    words: '<path d="M3 18l4-11 4 11M4.5 14h5"/><path d="M14 11a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM17 11v7"/>',
    listening: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/>',
    argument: '<path d="M12 4v16M5 20h14"/><path d="M5 8h14"/><path d="M5 8l-3 6h6zM19 8l-3 6h6z"/>',
    assets: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    checks: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    band: '<path d="M12 4l9 4-9 4-9-4z"/><path d="M7 10v5c3 2 7 2 10 0v-5"/>',
    quad: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>'
  };
  // A picture: the teacher's own image if it exists, over a DIALD illustration.
  function pic(key, icon, n, label) {
    const [a, b] = PAL[(n || 0) % PAL.length];
    return `<div class="cover" style="--c1:${a};--c2:${b}" aria-hidden="true">
      <svg class="cover-art" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><circle cx="270" cy="20" r="90" fill="#fff" opacity=".08"/><circle cx="40" cy="170" r="70" fill="#fff" opacity=".07"/>
        ${label ? `<text x="24" y="150" font-size="56" font-weight="800" fill="#fff" opacity=".9" font-family="Public Sans, Arial">${esc(label)}</text>` : ''}
        <g transform="translate(${label ? 210 : 124} ${label ? 30 : 42}) scale(${label ? 3.6 : 3.9})" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[icon] || ICON.lessons}</g></svg>
      <img src="library-img/${esc(key)}.jpg" alt="" loading="lazy" onerror="this.remove()">
    </div>`;
  }
  const card = (href, key, icon, n, title, text, opts = {}) => `<a class="pcard" href="${href}">${pic(key, icon, n, opts.label)}<div class="pcard-body">${opts.eyebrow ? `<div class="eyebrow">${esc(opts.eyebrow)}</div>` : ''}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${opts.foot ? `<span class="pcard-foot">${opts.foot}</span>` : ''}</div></a>`;
  const crumbs = list => `<nav class="crumbs" aria-label="Breadcrumb">${list.map(([t, h], i) => i < list.length - 1 ? `<a href="${h}">${esc(t)}</a><span aria-hidden="true">›</span>` : `<b>${esc(t)}</b>`).join('')}</nav>`;
  const page = (inner) => `<div class="page lib">${inner}</div>`;

  /* ---------- content for the five DIALD stages (public page) ---------- */
  const CYCLE = [
    { name: 'Profile', q: 'Who is this learner as a language user today?', what: 'DIALD gathers the learner’s Listening, Speaking, Reading, and Writing levels over several years, with years of services, grade, and, when available, scale scores, the state ELA test, and a benchmark.', teacher: ['Upload a class file or enter one learner’s levels.', 'Check that the years and grades are correct.', 'Read the plain-language profile: which domains are strong, which are below the reference level.'], gets: 'A clear description of the learner, year by year, with no names stored.' },
    { name: 'Pattern Indicator', q: 'Is there a pattern that could keep this learner from reaching proficiency?', what: 'DIALD places the learner in one of four oral–literacy profiles (quadrants), follows growth across years, and shows a provisional trajectory signal. It also shows the evidence side by side: time in services, English growth, benchmark, and state test, using your state’s rules.', teacher: ['Look at the quadrant over time: is the same pattern repeating?', 'Read the evidence behind the signal.', 'Ask the AI for ideas if it helps your team’s conversation.'], gets: 'A transparent signal (not a diagnosis) and the reasons behind it.' },
    { name: 'Instructional Focus', q: 'What should we teach first?', what: 'DIALD turns the pattern into priorities: the domains to strengthen and the lesson route in the Library that matches the profile and grade band.', teacher: ['Confirm the priority domains with what you see in class.', 'Choose a Library route or activities.', 'Set one measurable goal for the next 6–12 weeks.'], gets: 'A focused plan: what to teach, how, and how you will know it worked.' },
    { name: 'Response', q: 'Is the learner responding to the support?', what: 'At the review point, the teacher records the result on the same measure used for the baseline. DIALD reads the response as Positive, Partial, or Limited, and checks whether the plan was implemented as intended.', teacher: ['Use the same measure as the baseline (rubric, benchmark, or check).', 'Record the current result and how well the plan was carried out.', 'Save the plan so you can come back.'], gets: 'An honest reading of progress, separated from implementation problems.' },
    { name: 'Adaptation', q: 'What do we do next?', what: 'Based on the response, DIALD suggests keeping, adjusting, intensifying, or changing the support. New evidence returns to the Profile, and the cycle starts again.', teacher: ['Keep what worked and fade support step by step.', 'Adjust or intensify when progress is partial.', 'Bring limited response to your team (MTSS) with the evidence.'], gets: 'A next step and a new cycle, with the learner’s data growing over time.' }
  ];

  function frameworkPage(main, q, ctx) {
    const L5 = ctx.stageLook;
    const want = Number(q.get('stage'));
    const ico = (i, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${L5[i].i}</svg>`;
    const sec = (s, i) => `<section class="fw-stage" id="fw-s${i + 1}" style="--c:${L5[i].c}" aria-labelledby="fw-h${i + 1}">
        <div class="fw-head"><span class="fw-num">${i + 1}</span><div><div class="eyebrow">Stage ${i + 1} of 5</div><h2 id="fw-h${i + 1}">${esc(s.name)}</h2><p class="fw-q">${esc(s.q)}</p></div>${ico(i, 'fw-ico')}</div>
        <div class="fw-grid">
          <div class="card"><h3>What happens</h3><p>${esc(s.what)}</p></div>
          <div class="card"><h3>What the teacher does</h3><ol>${s.teacher.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
          <div class="card fw-gets"><h3>What you get</h3><p>${esc(s.gets)}</p></div>
        </div>
        <div class="fw-next">${i < 4
          ? `<button class="btn ghost" type="button" data-go="${i + 1}">Next: ${esc(CYCLE[i + 1].name)} ↓</button>`
          : `<span class="fw-loop">↻ New evidence returns to the Profile, and the cycle starts again.</span><button class="btn ghost" type="button" data-go="0">Back to Profile ↑</button>`}
          <button class="fw-top" type="button" data-top>↑ Back to the cycle</button></div>
      </section>`;
    main.innerHTML = page(`
      <div class="fw-hero">
        <div>
          <div class="eyebrow">The DIALD Framework</div>
          <h1>Five stages, one continuous cycle</h1>
          <p class="lead">DIALD (Data-Informed Academic Language Development) helps teachers move from language test data to instructional decisions for multilingual learners. Each stage feeds the next.</p>
          <ol class="fw-list">${CYCLE.map((s, i) => `<li style="--c:${L5[i].c}"><button type="button" data-go="${i}"><span>${i + 1}</span><b>${esc(s.name)}</b><small>${esc(s.q)}</small></button></li>`).join('')}</ol>
          <p class="small">Choose a stage on the wheel or in the list to jump to it.</p>
        </div>
        <div class="fw-wheel">${ctx.cycleHTML('fw-ring')}</div>
      </div>
      <nav class="fw-tabs" aria-label="Stages">${CYCLE.map((s, i) => `<button type="button" data-go="${i}" data-tab="${i}" style="--c:${L5[i].c}"><span>${i + 1}</span>${esc(s.name)}</button>`).join('')}</nav>
      <div class="fw-stack">${CYCLE.map(sec).join('')}</div>
      <div class="fw-foot"><a class="btn" href="#/library/stages">How the intervention stages work →</a><a class="btn primary" href="#/analyze">Try it in Learner Trajectory →</a></div>`);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = (i, smooth = true) => {
      const el = main.querySelector('#fw-s' + (i + 1)); if (!el) return;
      history.replaceState(null, '', '#/framework?stage=' + (i + 1));
      el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    };
    main.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(Number(b.dataset.go)));
    main.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { history.replaceState(null, '', '#/framework'); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    ctx.bindCycle('fw-ring', k => go(k));
    // The stage bar shows where you are while you scroll.
    const tabs = [...main.querySelectorAll('[data-tab]')];
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!document.body.contains(main.querySelector('.fw-stack'))) return io.disconnect();
        if (e.isIntersecting) { const k = Number(e.target.id.slice(4)) - 1; tabs.forEach((t, j) => t.classList.toggle('on', j === k)); const bar = tabs[k].parentNode; if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: tabs[k].offsetLeft - 12, behavior: reduce ? 'auto' : 'smooth' }); }
      }), { rootMargin: '-45% 0px -50% 0px' });
      main.querySelectorAll('.fw-stage').forEach(x => io.observe(x));
    }
    // Opened from the wheel or the menu with a stage: the page glides down to it.
    if (want >= 1 && want <= 5) setTimeout(() => go(want - 1), 380);
  }

  /* ---------- the four intervention stages ---------- */
  const STAGE_INFO = [
    { looks: 'Set routines, take a baseline, and teach the core skill of the route with strong scaffolds (frames, models, visuals, home language).', how: ['Week 1: baseline sample on the measure you will use all cycle.', 'Weeks 2–5: core skills with modeling and guided practice.', 'Week 6: mid-cycle check on the same measure.', 'Weeks 7–11: apply the skills to new texts and tasks.', 'Week 12: final sample and reflection.'], next: 'Move to Stage 2 when the learner meets the Stage 1 goal on the final sample, or keep Stage 1 with adjustments if the response is partial.' },
    { looks: 'Same skills with longer texts and tasks, fewer sentence frames, and more student talk.', how: ['Start from the Stage 1 final sample as the new baseline.', 'Remove one support at a time (frames, word banks).', 'Use partner and small-group work to rehearse before writing.', 'Mid-cycle and final checks on the same measure.'], next: 'Move to Stage 3 when the learner keeps the skill with fewer supports.' },
    { looks: 'Grade-level texts and more independent work. The learner chooses strategies without reminders.', how: ['Use grade-level texts from content classes.', 'Students plan, draft, and revise with peer feedback.', 'The teacher confers with individuals instead of leading every step.'], next: 'Move to Stage 4 when the learner works independently at grade level most of the time.' },
    { looks: 'Transfer to content classes and readiness for reclassification: the skills now show up in science, social studies, and ELA work.', how: ['Plan tasks with content teachers (push-in or co-planning).', 'Collect evidence from content-class work.', 'Review the state exit criteria with the team and the family.'], next: 'Review exit criteria with your team. After reclassification, keep monitoring for two years.' }
  ];
  function stagesPage(main) {
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['The four intervention stages', '']])}
      <h1>The four intervention stages</h1>
      <p class="lead" style="max-width:760px">Each Library route has four stages of 12 weeks (3 sessions of 45 minutes a week). A learner moves to the next stage when the evidence shows growth, not when the weeks end. Four stages together are 48 weeks of support toward reclassification.</p>
      <div class="stage-cards">${L.STAGES.map((s, i) => `<section class="card stage-card" id="stage-${s.n}"><div class="row" style="gap:14px;align-items:center">${pic('stage-' + s.n, 'stages', i + 1, String(s.n))}<div><div class="eyebrow">12 weeks</div><h2 style="margin:2px 0">${esc(s.name)}</h2><p class="small" style="margin:0">${esc(s.line)}</p></div></div>
        <h3>What it looks for</h3><p>${esc(STAGE_INFO[i].looks)}</p>
        <h3>How it works</h3><ul>${STAGE_INFO[i].how.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
        <h3>When to move on</h3><p>${esc(STAGE_INFO[i].next)}</p></section>`).join('')}</div>
      <p class="small">Completing the weeks does not by itself mean a learner is ready to exit. DIALD’s rules are provisional and are being validated.</p>`);
  }

  /* ---------- Library home ---------- */
  function home(main) {
    main.innerHTML = page(`<div class="eyebrow">DIALD Intervention Library</div><h1>Library</h1>
      <p class="lead" style="max-width:760px">Lessons organized by grade band, profile, and stage; activities with a short lesson plan; and strategies for co-teaching and for students with IEPs or 504 plans. The Library grows every week.</p>
      <div class="pgrid big">
        ${card('#/library/lessons', 'lessons', 'lessons', 0, 'Lessons', '12-week intervention routes by grade band, profile (quadrant), and stage.', { foot: '4 grade bands · 4 profiles · 4 stages' })}
        ${card('#/library/activities', 'activities', 'activities', 1, 'Activities', 'Classroom activities with purpose, steps, an example, and adaptations for levels 1–4.', { foot: L.activities.length + ' activities · ' + Object.keys(L.CATEGORIES).length + ' categories' })}
        ${card('#/library/stages', 'stages', 'stages', 2, 'The four intervention stages', 'What each 12-week stage looks for and when a learner moves on.')}
        ${card('#/library/push-in', 'push-in', 'pushin', 3, 'Push-in strategies', 'Ways to co-teach with content teachers so language support happens in the class.')}
        ${card('#/library/iep', 'iep-504', 'iep', 4, 'Students with IEPs or 504 plans', 'Strategies for dually identified learners, especially when specialized support is not in the room.')}
        ${card('#/framework', 'diald-cycle', 'cycle', 5, 'The DIALD cycle', 'The five stages of the framework, from Profile to Adaptation.')}
      </div>`);
  }

  /* ---------- Lessons ---------- */
  const QPIC = { Q1: 1, Q2: 0, Q3: 2, Q4: 5 };
  const BAND_NOTE = {
    '2-3': 'Use picture books and short read-alouds. Sessions of 20–30 minutes, with more talk and drawing before writing.',
    '4-5': 'Use short chapter books and informational articles. Sessions of 30–40 minutes.',
    '6-8': 'Use grade-level articles and short novels. Sessions of 45 minutes.',
    '9-12': 'Use content-area texts and longer argument tasks, and connect the work to graduation requirements. Sessions of 45 minutes.'
  };
  const STAGE_GOAL = ['', ' with longer texts and fewer frames', ' with grade-level texts, independently', ' in a content-area task'];
  // The written plan when there is one; otherwise an example built from the grades 6–8 Stage 1 sequence.
  function weeksFor(band, qd, n) {
    const own = L.lessons[band] && L.lessons[band][qd] && L.lessons[band][qd][n];
    if (own) return { weeks: own, example: false };
    const base = L.lessons['6-8'][qd][1];
    const fit = ids => { const ok = ids.filter(id => { const a = L.activities.find(x => x.id === id); return a && a.grades.includes(band); }); return ok.length ? ok : ['think-pair-share']; };
    return { example: true, weeks: base.map((w, i) => ({ title: i === 0 ? 'Goals and baseline for Stage ' + n : w.title, goal: i === 0 ? 'Baseline sample on the Stage ' + n + ' measure' : w.goal + (i === 11 ? '' : STAGE_GOAL[n - 1]), activities: fit(w.activities), status: 'planned' })) };
  }
  function lessonsBands(main) {
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Lessons', '']])}<h1>Lessons</h1>
      <p class="lead" style="max-width:760px">Choose a grade band. Each band has a route for each profile, and each route has four stages of 12 weeks.</p>
      <div class="pgrid">${L.GRADES.map((g, i) => card('#/library/lessons/' + g, 'grades-' + g, 'band', i, L.BANDS[g].name, L.BANDS[g].short + '. ' + BAND_NOTE[g], { label: g })).join('')}</div>`);
  }
  function lessonsQuads(main, band) {
    if (!L.BANDS[band]) return false;
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Lessons', '#/library/lessons'], [L.BANDS[band].name, '']])}<h1>${esc(L.BANDS[band].name)}: choose a profile</h1>
      <p class="lead" style="max-width:760px">Each profile has its own route. DIALD shows a learner’s profile in Learner Trajectory.</p>
      <div class="pgrid">${['Q1', 'Q2', 'Q3', 'Q4'].map(qd => card(`#/library/lessons/${band}/${qd}`, `${band}-${qd}`, 'quad', QPIC[qd], qd + ' · ' + E.QUADRANTS[qd].name, E.QUADRANTS[qd].short + '. ' + L.ROUTES[qd].focus, { label: qd })).join('')}</div>`);
    return true;
  }
  function lessonsStages(main, band, qd) {
    if (!L.BANDS[band] || !L.ROUTES[qd]) return false;
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Lessons', '#/library/lessons'], [L.BANDS[band].name, '#/library/lessons/' + band], [qd, '']])}
      <div class="eyebrow">${esc(L.BANDS[band].name)} · ${esc(E.QUADRANTS[qd].short)}</div><h1>${esc(qd)} · ${esc(E.QUADRANTS[qd].name)}</h1>
      <p class="lead" style="max-width:760px">${esc(L.ROUTES[qd].focus)}</p>
      <div class="pgrid">${L.STAGES.map((s, i) => card(`#/library/lessons/${band}/${qd}/${s.n}`, `${band}-${qd}-stage-${s.n}`, 'stages', i + 1, s.name, s.line, { label: String(s.n), foot: '12 weeks · 3 sessions a week' })).join('')}</div>
      <p class="small"><a href="#/library/stages">How the four stages work →</a></p>`);
    return true;
  }
  function lessonsWeeks(main, band, qd, n) {
    const st = L.STAGES.find(s => s.n === Number(n));
    if (!L.BANDS[band] || !L.ROUTES[qd] || !st) return false;
    const { weeks, example } = weeksFor(band, qd, st.n);
    const actLink = id => { const a = L.activities.find(x => x.id === id); return a ? `<a class="chip act" href="#/activity/${a.id}">${esc(a.name)}</a>` : ''; };
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Lessons', '#/library/lessons'], [L.BANDS[band].name, '#/library/lessons/' + band], [qd, `#/library/lessons/${band}/${qd}`], [st.name, '']])}
      <div class="row" style="gap:16px;align-items:center;margin-bottom:8px">${pic(`${band}-${qd}-stage-${st.n}`, 'stages', st.n, String(st.n))}
        <div><div class="eyebrow">${esc(L.BANDS[band].name)} · ${esc(qd)} · ${esc(E.QUADRANTS[qd].name)}</div><h1 style="margin:2px 0 4px">${esc(st.name)}</h1><p class="small" style="margin:0">${esc(st.line)} 12 weeks · 3 sessions of 45 minutes a week.</p></div></div>
      <div class="card"><b>Route focus:</b> ${esc(L.ROUTES[qd].focus)} <span class="small">${esc(BAND_NOTE[band])}</span>
        ${example ? '<p class="small" style="margin:8px 0 0"><span class="chip">Example plan</span> Built from the grades 6–8 Stage 1 sequence. Lessons for this stage are being written.</p>' : ''}</div>
      <ol class="weeks">${weeks.map((w, i) => `<li class="week ${i === 0 || i === 5 || i === 11 ? 'check' : ''}"><div class="wk-n">Week ${i + 1}</div><div class="wk-b"><b>${esc(w.title)}</b><p>${esc(w.goal)}</p><div class="wk-acts">${w.activities.map(actLink).join('')}</div></div>${i === 0 || i === 5 || i === 11 ? `<span class="chip">${i === 0 ? 'Baseline' : i === 5 ? 'Mid-cycle check' : 'Final check'}</span>` : ''}</li>`).join('')}</ol>
      <p class="small">Weeks 1, 6, and 12 use the same measure, so you can record the response in Learner Trajectory.</p>`);
    return true;
  }

  /* ---------- Activities ---------- */
  const CAT_ICON = { talk: 'talk', reading: 'reading', writing: 'writing', words: 'words', listening: 'listening', argument: 'argument', assets: 'assets', checks: 'checks' };
  let bandF = '';
  const bandBar = (href) => `<div class="bandbar" role="group" aria-label="Grade band"><span class="small">Grade band:</span>${[['', 'All'], ...L.GRADES.map(g => [g, g])].map(([v, t]) => `<button type="button" data-band="${v}" class="${bandF === v ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`;
  function bindBand(main, rerender) { main.querySelectorAll('[data-band]').forEach(b => b.onclick = () => { bandF = b.dataset.band; rerender(); }); }
  function activitiesHome(main) {
    const list = a => !bandF || a.grades.includes(bandF);
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Activities', '']])}<h1>Activities</h1>
      <p class="lead" style="max-width:760px">Each activity has a short lesson plan: what it builds, who it works best for, the steps, an example, sentence frames, and adaptations for levels 1–4.</p>
      ${bandBar()}
      <div class="pgrid">${Object.entries(L.CATEGORIES).map(([k, c], i) => card('#/library/activities/' + k, 'category-' + k, CAT_ICON[k], i, c.name, c.line, { eyebrow: c.combo, foot: L.activities.filter(a => a.category === k && list(a)).length + ' activities' })).join('')}</div>`);
    bindBand(main, () => activitiesHome(main));
  }
  function activitiesCat(main, cat) {
    const c = L.CATEGORIES[cat]; if (!c) return false;
    const i0 = Object.keys(L.CATEGORIES).indexOf(cat);
    const items = L.activities.filter(a => a.category === cat && (!bandF || a.grades.includes(bandF)));
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Activities', '#/library/activities'], [c.name, '']])}
      <div class="eyebrow">${esc(c.combo)}</div><h1>${esc(c.name)}</h1><p class="lead" style="max-width:760px">${esc(c.line)}</p>
      ${bandBar()}
      <div class="pgrid">${items.map((a, i) => card('#/activity/' + a.id, 'activity-' + a.id, CAT_ICON[cat], i0 + i, a.name, a.purpose, { eyebrow: a.minutes + ' min · ' + a.group, foot: 'Grades ' + a.grades.join(', ') })).join('') || '<p>No activities for this grade band yet.</p>'}</div>`);
    bindBand(main, () => activitiesCat(main, cat));
    return true;
  }
  function activityPage(main, id, q) {
    const a = L.activities.find(x => x.id === id); if (!a) return false;
    const c = L.CATEGORIES[a.category];
    let lv = Math.max(1, Math.min(4, Number(q.get('level')) || 2));
    const draw = () => {
      main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Activities', '#/library/activities'], [c.name, '#/library/activities/' + a.category], [a.name, '']])}
        <div class="act-head">${pic('activity-' + a.id, CAT_ICON[a.category], Object.keys(L.CATEGORIES).indexOf(a.category))}
          <div><div class="eyebrow">${esc(c.name)} · ${a.minutes} minutes</div><h1 style="margin:4px 0 8px">${esc(a.name)}</h1><p class="lead" style="margin:0">${esc(a.purpose)}</p></div></div>
        <div class="card bestfor"><h3>Works best for</h3><dl class="rules">
          <dt>Group</dt><dd>${esc(a.group)}</dd>
          <dt>Grade bands</dt><dd>${a.grades.map(g => esc(L.BANDS[g].name)).join(' · ')}</dd>
          <dt>Profiles</dt><dd>${a.quadrants.map(qd => `<span class="chip q">${qd} · ${esc(E.QUADRANTS[qd].name)}</span>`).join(' ')}</dd>
          <dt>Domains</dt><dd>${a.domains.map(cap).join(', ')}</dd></dl></div>
        <div class="split" style="margin-top:16px"><div class="stack">
          <div class="card"><h3>Lesson plan</h3><h4>Students will</h4><ul>${a.studentsWill.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
            <h4>Steps</h4><ol>${a.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            <h4>Example</h4><p class="example">${esc(a.example)}</p></div>
          <div class="card"><h3>Adapt for proficiency level</h3>
            <div class="levelbar" role="group" aria-label="Proficiency level">${[1, 2, 3, 4].map(n => `<button type="button" data-lv="${n}" class="${n === lv ? 'on' : ''}" aria-pressed="${n === lv}">Level ${n}${n === 4 ? '+' : ''}</button>`).join('')}</div>
            <div class="adapt">${esc(a.adaptations[lv])}</div></div>
        </div><div class="stack">
          <div class="card"><h3>Sentence frames</h3><ul class="frames">${a.frames.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
          <div class="card"><h3>Quick check</h3><p>${esc(a.check)}</p><h3>Materials</h3><p>${esc(a.materials)}</p><p class="small">Credit: ${esc(a.credit)}. Written for DIALD in our own words.</p></div>
        </div></div>`);
      main.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { lv = Number(b.dataset.lv); history.replaceState(null, '', '#/activity/' + a.id + '?level=' + lv); draw(); });
    };
    draw();
    return true;
  }

  /* ---------- Push-in and IEP / 504 ---------- */
  function pushinPage(main) {
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Push-in strategies', '']])}
      <div class="act-head">${pic('push-in', 'pushin', 3)}<div><h1 style="margin:0 0 8px">Push-in strategies</h1><p class="lead" style="margin:0">Ways for the ESL teacher and the content teacher to share a class so that language support happens where the content is taught.</p></div></div>
      <div class="pgrid">${L.pushin.map((m, i) => `<div class="card pin"><div class="pin-n">${i + 1}</div><h3>${esc(m.name)}</h3><p>${esc(m.line)}</p><p class="small"><b>Works well for:</b> ${esc(m.when)}</p></div>`).join('')}</div>
      <div class="card"><h3>Before you co-teach</h3><ul><li>Plan 15 minutes a week together: the content objective and one language objective.</li><li>Agree on 3–5 key words and one sentence frame for the lesson.</li><li>Decide who checks for understanding with which students.</li><li>Use DIALD profiles to group students (for example, Q1 learners in the writing station).</li></ul>
      <p class="small">Co-teaching models from Friend & Cook (2017), <i>Interactions: Collaboration Skills for School Professionals</i>. Applied to multilingual learners by DIALD.</p></div>`);
  }
  const IEP = [
    { t: 'Oral language as the first scaffold', d: 'Many dually identified students read and write far below grade level. Invite spoken answers first, then support the move to writing.', how: ['Read directions aloud.', 'Let students answer by speaking, pointing, or completing a sentence frame.', 'Write down the spoken answer together, then let the student copy or extend it.'] },
    { t: 'Word → image → oral chain', d: 'Students who struggle with print need more than one way into new words.', how: ['Preview 3–5 key words before reading.', 'Show each word with an image and say it together.', 'Have the student use each word out loud in a short sentence.'] },
    { t: 'Real objects and real-world connections', d: 'Abstract ideas are harder to reach with limited academic language. Real objects and daily situations make them concrete.', how: ['Use real money, food packaging, maps, or bus schedules.', 'Connect word problems to shopping, cooking, or getting around town.'] },
    { t: 'Lower the affective filter', d: 'Many of these students carry years of feeling less capable. A safe classroom lowers anxiety and opens the door to learning (Krashen, 1982).', how: ['Check in privately before whole-group sharing.', 'Confirm the answer together first, then invite the student to share.', 'Correct quietly, one-on-one.'] },
    { t: 'Peer-mediated learning', d: 'Students learn well next to a peer who is a little ahead of them, in their zone of proximal development (Vygotsky, 1978).', how: ['Pair the student with a consistent, trusted peer.', 'Give clear roles and sentence frames.', 'Use the pair as a safe rehearsal space before sharing.'] },
    { t: 'Same content, different access', d: 'Keep the same rigorous content for everyone, with a different entry point, not a lower bar.', how: ['Same test, with an oral answer recorded.', 'Same essay topic, with an illustrated storyboard and narration.', 'Same word problem, with visual models and manipulatives.'] }
  ];
  function iepPage(main) {
    main.innerHTML = page(`${crumbs([['Library', '#/library'], ['Students with IEPs or 504 plans', '']])}
      <div class="act-head">${pic('iep-504', 'iep', 4)}<div><h1 style="margin:0 0 8px">Students with IEPs or 504 plans</h1><p class="lead" style="margin:0">Dually identified students qualify for both multilingual learner services and special education. They carry two profiles at once: language development and a disability-related learning need.</p></div></div>
      <div class="card"><h3>When support isn’t in the room</h3><p>In many schools, language supports and IEP accommodations are planned separately, by different teachers. When the special education teacher is absent, the ESL or classroom teacher holds both profiles alone. These six strategies help that teacher keep the student learning.</p></div>
      <div class="pgrid">${IEP.map((s, i) => `<div class="card pin"><div class="pin-n">${i + 1}</div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p><ul>${s.how.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>`).join('')}</div>
      <div class="card"><h3>Plan it: add an Access Objective</h3><p>Next to the content objective and the language objective, add a third one: the <b>Access Objective</b>. It names how this student will reach the same content today (for example: “The student will answer orally with a sentence frame and a visual model”).</p><ul><li>Add a shared section to the lesson plan where the ESL and special education teachers write the strategies for dually identified students.</li><li>When the special education teacher is absent, carry the Access Objective forward with the six strategies above.</li></ul>
        <p class="small">Try it: a 7th grader at English level 2 with an IEP for reading has a written science question, and the special education teacher is absent. Which two strategies would you use first? “When this student needs ___, I will ___ because ___.”</p></div>
      <div class="card"><h3>In DIALD</h3><p>When a class file marks a student with an IEP or a 504 plan, DIALD shows it on the class list and reminds you to review language and learning needs together with the student’s team. DIALD does not separate language needs from disability-related needs; the team does.</p>
        <p class="small">Strategies by Darlin Cortico Rosario. Sources: Klingner & Artiles (2006); Krashen (1982); Vygotsky (1978); Echevarria, Vogt, Short & Toppel (2024).</p></div>`);
  }

  /* ---------- router for #/library/... ---------- */
  function render(main, parts, q) {
    const [sec, a, b, c] = parts;
    if (!sec) return home(main), true;
    if (sec === 'lessons') {
      if (!a) return lessonsBands(main), true;
      if (!b) return lessonsQuads(main, a);
      if (!c) return lessonsStages(main, a, b);
      return lessonsWeeks(main, a, b, c);
    }
    if (sec === 'activities') return a ? activitiesCat(main, a) : (activitiesHome(main), true);
    if (sec === 'stages') return stagesPage(main), true;
    if (sec === 'push-in') return pushinPage(main), true;
    if (sec === 'iep') return iepPage(main), true;
    return false;
  }
  window.DIALDLibUI = { render, activityPage, frameworkPage, CYCLE };
})();
