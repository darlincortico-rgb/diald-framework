/* DIALD help: the "How to use DIALD" page, the first-visit tour, and the feedback bubble.
   The feedback form sends only what the teacher types (plus the page name) to the author's
   form service. It never sends student data. */
(function () {
  'use strict';
  const C = window.DIALD_CONFIG || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TOUR_KEY = 'diald-tour-done';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } } };

  /* ---------- feedback bubble ---------- */
  // Two ways to receive messages: a Google Form (free, no monthly limit) or Formspree.
  const GF = C.feedbackGoogleForm && C.feedbackGoogleForm.action && C.feedbackGoogleForm.fields ? C.feedbackGoogleForm : null;
  // Simplest option: the Google Form link itself, shown inside the chat window.
  const EMBED = !C.feedbackFormLink ? '' : /forms\.gle/.test(C.feedbackFormLink) ? String(C.feedbackFormLink).trim() : String(C.feedbackFormLink).trim().replace(/\?.*$/, '').replace(/\/(edit|viewform|formResponse)?$/, '/viewform');
  const formUrl = () => (EMBED ? EMBED : GF ? GF.action : C.feedbackFormId ? 'https://formspree.io/f/' + encodeURIComponent(C.feedbackFormId) : '');
  async function sendMessage(m) {
    if (GF) {
      const body = new URLSearchParams();
      Object.entries(GF.fields).forEach(([k, entry]) => { if (entry && m[k]) body.append(entry, m[k]); });
      // Google Forms does not allow reading the reply from another site, so a sent request counts as delivered.
      await fetch(GF.action, { method: 'POST', mode: 'no-cors', body });
      return;
    }
    const res = await fetch(formUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ _subject: 'DIALD: ' + m.type }, m)) });
    if (!res.ok) throw new Error('status ' + res.status);
  }
  let fbUser = null;
  function mountEmbedded() {
    const box = document.createElement('div');
    box.id = 'fb';
    box.innerHTML = `
      <button class="fb-btn" id="fb-btn" type="button" aria-expanded="false" aria-controls="fb-panel" title="Questions or ideas?">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4.5 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="currentColor"/></svg>
        <span>Questions?</span></button>
      <div class="fb-panel fb-embed" id="fb-panel" role="dialog" aria-label="Send a question or idea" hidden>
        <div class="fb-head"><b>Questions or ideas?</b><button type="button" class="fb-x" id="fb-x" aria-label="Close">×</button></div>
        <p class="fb-warn" style="margin-top:0">🔒 Please do not include student names or IDs.</p>
        <div class="fb-frame"></div>
        <p class="small" style="margin:8px 0 0"><a href="${esc(EMBED)}" target="_blank" rel="noopener">Open the form in a new tab ↗</a></p>
      </div>`;
    document.body.appendChild(box);
    const panel = box.querySelector('#fb-panel'), btn = box.querySelector('#fb-btn');
    const set = open => {
      panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      const fr = box.querySelector('.fb-frame');
      if (open && !fr.firstChild) fr.innerHTML = `<iframe src="${esc(EMBED)}?embedded=true" title="DIALD question form" loading="lazy"></iframe>`;
    };
    btn.onclick = () => {
      // Short forms.gle links cannot be shown inside the page, so they open in a new tab (as on phones).
      if (/forms\.gle/.test(EMBED) || window.matchMedia('(max-width: 600px)').matches) { window.open(EMBED, '_blank', 'noopener'); return; }
      set(panel.hidden);
    };
    box.querySelector('#fb-x').onclick = () => set(false);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) set(false); });
    const main = document.getElementById('main');
    const lift = () => document.body.classList.toggle('has-savebar', !!document.getElementById('savebar'));
    new MutationObserver(lift).observe(main, { childList: true, subtree: true }); lift();
  }
  function mountFeedback() {
    if (!formUrl() || document.getElementById('fb')) return;
    if (EMBED) return mountEmbedded();
    const box = document.createElement('div');
    box.id = 'fb';
    box.innerHTML = `
      <button class="fb-btn" id="fb-btn" type="button" aria-expanded="false" aria-controls="fb-panel" title="Questions or ideas?">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4.5 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="currentColor"/></svg>
        <span>Questions?</span></button>
      <div class="fb-panel" id="fb-panel" role="dialog" aria-label="Send a question or idea" hidden>
        <div class="fb-head"><b>Questions or ideas?</b><button type="button" class="fb-x" id="fb-x" aria-label="Close">×</button></div>
        <form id="fb-form">
          <p class="small" style="margin-top:0">Your message goes to Darlin Cortico Rosario, the author of DIALD.</p>
          <label for="fb-type">Type</label>
          <select id="fb-type" name="type"><option>Question</option><option>Suggestion</option><option>Something is not working</option><option>Other</option></select>
          <label for="fb-msg">Message</label>
          <textarea id="fb-msg" name="message" rows="5" maxlength="3000" required placeholder="Write your question or idea"></textarea>
          <p class="fb-warn">🔒 Please do not include student names or IDs.</p>
          <label for="fb-email">Your email (optional, for a reply)</label>
          <input id="fb-email" name="email" type="email" maxlength="120" placeholder="you@school.org">
          <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" class="fb-hp" aria-hidden="true">
          <p class="err" id="fb-err" role="alert"></p>
          <button class="btn primary" type="submit" id="fb-send">Send</button>
        </form>
        <div id="fb-done" hidden><p><b>Thank you!</b> Your message was sent.</p><button class="btn" type="button" id="fb-again">Send another</button></div>
      </div>`;
    document.body.appendChild(box);
    const $ = s => box.querySelector(s);
    const panel = $('#fb-panel'), btn = $('#fb-btn');
    const set = open => {
      panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) { if (fbUser && fbUser.email && !$('#fb-email').value) $('#fb-email').value = fbUser.email; setTimeout(() => $('#fb-msg').focus(), 30); }
    };
    btn.onclick = () => set(panel.hidden);
    $('#fb-x').onclick = () => set(false);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) set(false); });
    $('#fb-again').onclick = () => { $('#fb-done').hidden = true; $('#fb-form').hidden = false; $('#fb-msg').value = ''; $('#fb-msg').focus(); };
    $('#fb-form').onsubmit = async e => {
      e.preventDefault();
      const msg = $('#fb-msg').value.trim(), err = $('#fb-err');
      if (msg.length < 3) { err.textContent = 'Please write a message.'; return; }
      err.textContent = ''; $('#fb-send').disabled = true; $('#fb-send').textContent = 'Sending…';
      try {
        const page = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) || 'home';
        if (box.querySelector('.fb-hp').value) throw new Error('spam'); // hidden field filled in: a bot
        await sendMessage({ type: $('#fb-type').value, message: msg, email: $('#fb-email').value.trim(), page });
        $('#fb-form').hidden = true; $('#fb-done').hidden = false;
      } catch (x) {
        err.textContent = 'The message could not be sent. Please try again in a moment.';
      } finally { $('#fb-send').disabled = false; $('#fb-send').textContent = 'Send'; }
    };
    // Stay above the "Save as a plan" bar when it is on the page.
    const main = document.getElementById('main');
    const lift = () => document.body.classList.toggle('has-savebar', !!document.getElementById('savebar'));
    new MutationObserver(lift).observe(main, { childList: true, subtree: true }); lift();
  }
  const openFeedback = () => { const b = document.getElementById('fb-btn'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); };

  /* ---------- first-visit tour ---------- */
  const STEPS = [
    { sel: null, title: 'Welcome to DIALD', text: 'This short tour shows where to find each part of the platform. It takes about one minute.' },
    { sel: '[data-nav="home"]', title: 'Dashboard', text: 'Your home page: updates, a monitor of your class, the four profiles, and the DIALD cycle.' },
    { sel: '[data-nav="analyze"]', title: 'Learner Trajectory', text: 'Upload a whole class with the Excel template, or enter one learner’s data. Then follow the five stages: Profile, Pattern Indicator, Instructional Focus, Response, and Adaptation.' },
    { sel: '[data-nav="library"]', title: 'Library', text: 'Lessons by grade band, profile, and stage (12 weeks each); activities with a short lesson plan; push-in strategies; and strategies for students with IEPs or 504 plans.' },
    { sel: '[data-nav="plans"]', title: 'My plans', text: 'Plans you saved. Open one to record the learner’s progress and see how they responded.' },
    { sel: '#find-btn', title: 'Find a student', text: 'After you upload your class, search for any student by name or ID and open their profile. The search stays on your computer.' },
    { sel: '#acct-btn', title: 'Profile & settings', text: 'Your state is saved here. DIALD uses it to choose the exit criteria, LTEL time, and state tests it reads.' },
    { sel: '[data-nav="help"]', title: 'Help', text: 'Step-by-step guides for every part of DIALD. Restart this tour from Help or from your profile menu at any time.' },
    { sel: '#fb-btn', title: 'Questions or ideas?', text: 'Send a question or a suggestion to the author at any time.' }
  ];
  function startTour() {
    endTour();
    const mobile = window.matchMedia('(max-width: 860px)').matches;
    const steps = STEPS.filter(s => !s.sel || document.querySelector(s.sel) || mobile);
    let i = 0;
    const wrap = document.createElement('div'); wrap.id = 'tour';
    wrap.innerHTML = `<div class="tour-ring" hidden></div><div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t"><div class="tour-n"></div><h3 id="tour-t"></h3><p></p><div class="row"><button class="btn ghost" type="button" data-t="skip">Skip tour</button><span style="flex:1"></span><button class="btn" type="button" data-t="back">Back</button><button class="btn primary" type="button" data-t="next">Next</button></div></div>`;
    document.body.appendChild(wrap);
    const ring = wrap.querySelector('.tour-ring'), card = wrap.querySelector('.tour-card');
    const show = () => {
      const s = steps[i];
      let el = s.sel ? document.querySelector(s.sel) : null;
      if (el && el.offsetParent === null) el = s.sel.startsWith('[data-nav') ? document.getElementById('menu-btn') : null;
      card.querySelector('.tour-n').textContent = (i + 1) + ' of ' + steps.length;
      card.querySelector('h3').textContent = s.title; card.querySelector('p').textContent = s.text;
      wrap.querySelector('[data-t="back"]').hidden = i === 0;
      wrap.querySelector('[data-t="next"]').textContent = i === steps.length - 1 ? 'Done' : 'Next';
      if (el) {
        const r = el.getBoundingClientRect(), pad = 6;
        ring.hidden = false;
        Object.assign(ring.style, { top: (r.top - pad) + 'px', left: (r.left - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
        const cw = Math.min(340, window.innerWidth - 32);
        let left = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), window.innerWidth - cw - 16);
        let top = r.bottom + 14;
        card.style.width = cw + 'px';
        card.classList.remove('center');
        Object.assign(card.style, { left: left + 'px', top: top + 'px' });
        const ch = card.offsetHeight;
        if (top + ch > window.innerHeight - 16) card.style.top = Math.max(16, r.top - ch - 14) + 'px';
      } else {
        ring.hidden = true; card.classList.add('center'); card.style.left = ''; card.style.top = ''; card.style.width = '';
      }
      wrap.querySelector('[data-t="next"]').focus();
    };
    wrap.onclick = e => {
      const t = e.target.closest('[data-t]'); if (!t) return;
      if (t.dataset.t === 'skip') return endTour(true);
      if (t.dataset.t === 'back') { i = Math.max(0, i - 1); return show(); }
      if (i === steps.length - 1) return endTour(true);
      i++; show();
    };
    wrap.onkeydown = e => { if (e.key === 'Escape') endTour(true); };
    window.addEventListener('resize', show);
    wrap._off = () => window.removeEventListener('resize', show);
    window.scrollTo(0, 0); show();
  }
  function endTour(done) {
    const w = document.getElementById('tour'); if (w) { if (w._off) w._off(); w.remove(); }
    if (done) ls.set(TOUR_KEY, '1');
  }
  function maybeTour() { if (!ls.get(TOUR_KEY)) setTimeout(() => { if (!document.getElementById('tour')) startTour(); }, 600); }

  /* ---------- Help page ---------- */
  const TOPICS = [
    ['start', 'Getting started', `
      <ol class="steps">
        <li><b>Create a free account</b> and complete your profile. Choose your <b>state</b>: DIALD uses it to pick the rules for your state.</li>
        <li>Go to <b>Learner Trajectory</b>. Choose <b>A whole class</b> to upload your class file (download the Excel template first), or <b>One learner</b> to enter one learner’s data.</li>
        <li>Open a student to see the <b>trajectory signal</b>, the evidence, and the next steps.</li>
        <li>Choose support from the <b>Library</b>, save a plan, and later record the learner’s progress.</li>
      </ol>
      <p>DIALD is a research prototype. Its rules are provisional and are being validated. Results are for educator review, not diagnoses.</p>`],
    ['file', 'Load a class file', `
      <p>Export your language test results from your data system (for example, LAS Links, ACCESS, ELPAC, or NYSESLAT) as Excel or CSV. The template has one row per student and a block of columns for each school year (the year is in the column name, as in Ellevation or DRC longitudinal exports). Files with one row per student per year also work.</p>
      <ul>
        <li><b>New:</b> the templates have <b>IEP</b> and <b>504</b> columns (Yes/No). They stay on your computer and add a note on the student’s page.</li>
        <li><b>Required:</b> a name or ID column, and the four domain levels (Listening, Speaking, Reading, Writing) for each year.</li>
        <li><b>Helpful:</b> school year, grade, years in ELD services, overall level, literacy composite, scale scores, state ELA test level (for example SBA, MCAS, CAASPP, NYS ELA), and a benchmark result (for example i-Ready, Star, MAP, DIBELS).</li>
      </ul>
      <p>Start from a template: <a href="DIALD-template-basic.xlsx" download>Basic</a> (language test levels and years of services only) or <a href="DIALD-template-complete.xlsx" download>Complete</a> (adds scale scores, overall and literacy levels, state ELA test, and benchmark). Fill only the columns you have: DIALD uses what is there and tells you what is missing. Then go to <b>Learner Trajectory → A whole class</b> and upload your file. DIALD matches the columns by their names. In <b>Check the columns</b>, fix any match that is wrong, choose your <b>state rules</b>, and choose <b>Analyze</b>.</p>
      <p>🔒 Your file is read in your browser. Student names and IDs never leave your computer.</p>`],
    ['dashboard', 'Read the dashboard', `
      <p>Your <b>Dashboard</b> is your home page: updates, a <b>class monitor</b> (your class, or an example until you upload one), the four profiles, how a class moves across levels, and the DIALD cycle. After you upload a class in Learner Trajectory, <b>My class</b> shows:</p>
      <ul>
        <li><b>Tiles:</b> how many students, how many are oral dominant, how many show a persistent signal, and how many may meet your state’s exit criteria.</li>
        <li><b>Quadrants:</b> each dot is a student. Up = stronger oral language (Listening and Speaking); right = stronger literacy (Reading and Writing). Arrows show last year’s position. A red ring marks a persistent signal.</li>
        <li><b>Signals:</b> how many students are in each trajectory signal. Click a bar to filter the list.</li>
        <li><b>Domains:</b> the percentage of students at or above the reference level in each domain.</li>
        <li><b>Criteria column:</b> how many of the four kinds of evidence show a concern (for example “2 of 4”).</li>
      </ul>`],
    ['signal', 'The trajectory signal and the four criteria', `
      <p>The <b>trajectory signal</b> looks at English proficiency over time:</p>
      <ul>
        <li><b>No persistent signal:</b> no domain shows low performance together with no growth.</li>
        <li><b>Emerging:</b> low and no growth in the last year. Watch the next one.</li>
        <li><b>Persistent:</b> low and no growth for two or more years in a row.</li>
        <li><b>Near or past the LTEL time:</b> persistent, with one year or less before the state’s LTEL time.</li>
      </ul>
      <p>In Connecticut, with LAS Links scale scores and grades, DIALD compares growth with the state’s growth targets for the Oral and Literacy composites.</p>
      <p>DIALD also shows four kinds of evidence side by side: <b>time in services</b>, <b>English proficiency growth</b>, <b>benchmark</b>, and the <b>state ELA test</b>. It counts the concerns but does not weight them, because the combination is still being validated.</p>`],
    ['states', 'State rules', `
      <p>DIALD has rules for <b>Connecticut, Massachusetts, California, and New York</b>: the language test, the exit criteria, the LTEL definition, and the state ELA test. Each rule shows its official source and whether it is verified or still to be confirmed. Other states use a general rule for now.</p>
      <p>Your profile state is used by default. You can change it when you load a file or in the Reference level card of Learner Trajectory.</p>`],
    ['trajectory', 'Learner Trajectory (one learner)', `
      <ol class="steps">
        <li><b>Data, then Profile:</b> enter each year’s domain levels (levels only, never names). DIALD builds the learner’s profile from them; choose <b>Edit the data</b> to change anything.</li>
        <li><b>Pattern Indicator:</b> the quadrant, the trajectory signal, the evidence, and the rules used.</li>
        <li><b>Instructional Focus:</b> pathways from the Library that match the learner’s priorities.</li>
        <li><b>Response:</b> record the baseline, the goal, and the current result.</li>
        <li><b>Adaptation:</b> next steps based on how the learner responded.</li>
      </ol>`],
    ['plans', 'Library and saved plans', `
      <p>The <b>Library</b> has six parts:</p>
      <ul>
        <li><b>Lessons:</b> choose a grade band (2–3, 4–5, 6–8, 9–12), then a profile (Q1–Q4), then a stage (1–4). Each stage is 12 weeks with a goal and suggested activities for each week.</li>
        <li><b>Activities:</b> choose a category, then an activity. Each one has a short lesson plan, an example, sentence frames, and adaptations for levels 1–4.</li>
        <li><b>The four intervention stages</b>, <b>push-in strategies</b>, <b>students with IEPs or 504 plans</b>, and <b>the DIALD cycle</b>.</li>
      </ul>
      <p>Choose <b>Save as a plan</b> to keep a learner’s analysis. Plans are named “Plan 1, Plan 2…”. If you opened the student from your file, the name is shown only on your computer. Open <b>My plans</b> to rename a plan (no student names) or record progress.</p>`],
    ['faq', 'Frequently asked questions', `
      <details><summary>Is DIALD free?</summary><p>Yes. DIALD is free for educators.</p></details>
      <details><summary>Does DIALD store student names?</summary><p>No. Your file is read in your browser, and names and IDs never leave your computer. Saved plans keep only levels, scores, and results.</p></details>
      <details><summary>Which language tests work with DIALD?</summary><p>Any test that reports Listening, Speaking, Reading, and Writing levels, such as LAS Links, WIDA ACCESS, ELPAC, NYSESLAT, or ELPA21.</p></details>
      <details><summary>Is DIALD validated?</summary><p>Not yet. DIALD is a research prototype. Its rules are provisional and transparent, and they are being studied. Use the results to support your professional judgment, not to replace it.</p></details>
      <details><summary>Does a persistent signal mean the student is an LTEL?</summary><p>No. The signal shows a pattern of low performance without growth. Your state’s definition and your team’s review decide a student’s status. The signal is not a probability or a diagnosis.</p></details>
      <details><summary>My state is not in the list. Can I still use DIALD?</summary><p>Yes. DIALD uses a general rule for other states. You can still choose the LTEL time and the exit level. Send a message if you want your state added.</p></details>
      <details><summary>Why does a student show “Insufficient evidence” or “Not computable”?</summary><p>DIALD needs at least two years of results with all four domains. Add more years or the missing columns.</p></details>
      <details><summary>What if the student has an IEP?</summary><p>Review language and learning needs together with your MTSS or special education team. DIALD does not separate language needs from disability-related needs.</p></details>
      <details><summary>Can my school or district buy DIALD?</summary><p>Not at this time. DIALD is still in the research stage and is not for sale.</p></details>
      <details><summary>Who created DIALD?</summary><p>Darlin Cortico Rosario, an ESOL/TESOL teacher and doctoral researcher, created the DIALD Framework.</p></details>`],
    ['security', 'Signing in and security', `
      <p>For security, DIALD signs you out when you close the tab or the browser, and after 30 minutes without activity (you get a warning 2 minutes before). Your class file stays on your computer only if you chose “Keep this file on this computer”.</p>`],
    ['privacy', 'Privacy', `
      <p>DIALD never stores student names or IDs. Your file is read in your browser. Saved plans keep only levels, scores, grade, years of services, results, and the pathways you chose, and the database rejects any other field. Read the full <a href="#/privacy">privacy page</a>.</p>`],
    ['contact', 'Contact', `
      <p>Questions, ideas, or something that is not working? Send a message to the author. You can also use the <b>Questions?</b> button at the bottom of any page.</p>
      <p data-contact><button class="btn primary" type="button" data-ask>Send a message</button></p>`]
  ];
  function page(main) {
    main.innerHTML = `<div class="page help">
      <div class="eyebrow">Help</div>
      <h1>How to use DIALD</h1>
      <p class="lead">Short guides for each part of the platform.</p>
      <div class="row" style="margin:6px 0 22px">
        <button class="btn primary" type="button" id="h-tour">↻ Restart the tour</button>
        ${formUrl() ? '<button class="btn" type="button" id="h-ask">Ask a question</button>' : ''}
      </div>
      <div class="help-grid">
        <nav class="help-toc" aria-label="Help topics">${TOPICS.map(([id, t]) => `<a href="#/help?t=${id}" data-h="${id}">${esc(t)}</a>`).join('')}</nav>
        <div class="help-body">${TOPICS.map(([id, t, html]) => `<section class="card" id="h-${id}"><h2>${esc(t)}</h2>${html}</section>`).join('')}</div>
      </div></div>`;
    main.querySelector('#h-tour').onclick = replay;
    const ask = main.querySelector('#h-ask'); if (ask) ask.onclick = openFeedback;
    main.querySelectorAll('[data-ask]').forEach(b => { if (formUrl()) b.onclick = openFeedback; else b.closest('[data-contact]').innerHTML = '<span class="small">The message form is coming soon.</span>'; });
    main.querySelectorAll('[data-h]').forEach(a => a.onclick = e => {
      e.preventDefault(); const s = document.getElementById('h-' + a.dataset.h); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const t = new URLSearchParams(location.hash.split('?')[1] || '').get('t');
    if (t) setTimeout(() => { const s = document.getElementById('h-' + t); if (s) s.scrollIntoView({ block: 'start' }); }, 50);
  }

  // Go to the Dashboard and start the tour from the beginning.
  function replay() { endTour(); if (location.hash === '#/' || location.hash === '') { window.scrollTo(0, 0); setTimeout(startTour, 200); } else { location.hash = '#/'; setTimeout(startTour, 700); } }
  window.DIALDHelp = { page, replay, startTour, maybeTour, mountFeedback, openFeedback, setUser: u => { fbUser = u; } };
})();
