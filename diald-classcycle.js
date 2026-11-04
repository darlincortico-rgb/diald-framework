/* DIALD class cycle — the five DIALD stages for a whole class, one group per quadrant.
   Uses the class file loaded on this computer (diald-roster.js) and the teacher's group plans. */
(function () {
  'use strict';
  const E = window.DIALDEngine, L = window.DIALDLibrary || {};
  const QS = ['Q1', 'Q2', 'Q3', 'Q4'];
  const QC = { Q1: '#2A9488', Q2: '#1B3A5C', Q3: '#E3A93B', Q4: '#5FB3A8' };
  const STAGES = ['Profile', 'Pattern Indicator', 'Instructional Focus', 'Response', 'Adaptation'];
  const DN = { listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing' };
  const bandName = b => (L.BANDS && L.BANDS[b] ? L.BANDS[b].name : 'Grades ' + b);
  const pct = (n, t) => (t ? Math.round(n / t * 100) : 0);
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const count = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k != null && k !== '') m[k] = (m[k] || 0) + 1; }); return m; };
  const crit = (x, key) => (x.r.criteria || []).find(c => c.key === key);
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const setName = () => 'Class plan · ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const noSetCols = e => e && /set_id|set_name/.test(e.message || '');
  // Insert group plans; if the class-plans SQL was not run yet, save them without the grouping.
  async function insertPlans(sb, rows, toast) {
    let r = await sb.from('group_plans').insert(rows).select('id');
    if (r.error && noSetCols(r.error)) {
      r = await sb.from('group_plans').insert(rows.map(x => { const y = Object.assign({}, x); delete y.set_id; delete y.set_name; return y; })).select('id');
      if (!r.error && toast) toast('Saved. To group plans into one class plan, run supabase-class-plans.sql once in Supabase.');
    }
    return r;
  }
  // The class plan (set) that already holds students from the file loaded now, if any.
  function findSet(plans, items) {
    const codes = new Set(items.map(x => x.s.code));
    const g = plans.find(p => p.set_id && (p.members || []).some(m => codes.has(m.c)));
    return g ? { setId: g.set_id, setName: g.set_name || 'Class plan' } : null;
  }
  async function currentSet(sb) {
    const R = window.DIALDRoster, G = window.DIALDGroups, items = R ? R.analyzedItems() : [];
    const r = sb && G ? await G.list(sb) : { data: [] };
    return findSet(r.data || [], items) || { setId: uuid(), setName: setName() };
  }

  async function render(main, stage, ctx, setId) {
    const { esc } = ctx, R = window.DIALDRoster, G = window.DIALDGroups;
    const fileItems = R ? R.analyzedItems() : [];
    const st = Math.max(0, Math.min(4, Number(stage) || 0));
    let plans = [], planErr = '';
    if (ctx.sb && G) { const r = await G.list(ctx.sb); if (r.error) planErr = G.isSetupError(r.error) ? G.SETUP : r.error.message; else plans = r.data || []; }
    let items = fileItems, set = null, full = true;
    if (setId) {
      const sp = plans.filter(g => (g.set_id || 'other') === setId);
      if (!sp.length) { main.innerHTML = `<div class="page"><div class="card"><p>${esc(planErr || 'This class plan was not found.')}</p><a class="btn" href="#/plans">My plans</a></div></div>`; return; }
      const codes = new Set(sp.flatMap(g => (g.members || []).map(m => m.c)));
      set = { id: setId, name: sp[0].set_name || (setId === 'other' ? 'Other group plans' : 'Class plan'), plans: sp, codes };
      plans = sp;
      items = fileItems.filter(x => codes.has(x.s.code));
      full = items.length > 0;
    } else if (!items.length) {
      main.innerHTML = `<div class="page"><div class="card"><h2 style="margin-top:0">No class file on this computer</h2><p>Upload your class first, or open a saved class plan in <a href="#/plans">My plans</a>.</p><a class="btn primary" href="#/class">Upload a class</a></div></div>`;
      return;
    } else {
      const fs = findSet(plans, items); if (fs) plans = plans.filter(g => g.set_id === fs.setId);
      else plans = plans.filter(g => !g.set_id && (g.members || []).some(m => items.some(x => x.s.code === m.c)));
    }
    const info = R ? R.classInfo() : null;
    const by = {}; QS.forEach(q => { by[q] = items.filter(x => x.r.quadrant.id === q); });
    // Without the file, the number of students per quadrant comes from the saved plans.
    const nq = q => full ? by[q].length : new Set(plans.filter(g => g.quadrant === q).flatMap(g => (g.members || []).map(m => m.c))).size;
    const total = QS.reduce((t, q) => t + nq(q), 0);
    const base = set ? `#/cycle/${encodeURIComponent(set.id)}?s=` : '#/class/cycle?s=';
    const head = q => `<div class="cc-qhead" style="--c:${QC[q]}"><span class="qchip" style="--c:${QC[q]}">${q}</span><b>${esc(E.QUADRANTS[q].name)}</b><span class="small">${plural(nq(q), 'student')} · ${pct(nq(q), total)}%</span></div>`;
    const empty = q => `<p class="small">No students in this profile.</p>`;
    const bands = q => { if (!full) { const c = count(plans.filter(g => g.quadrant === q), g => g.band); return Object.keys(c).map(b => ({ b, n: plans.filter(g => g.quadrant === q && g.band === b).reduce((t, g) => t + (g.members || []).length, 0) })); } const c = count(by[q], x => R.band(x.s.grade)); return Object.keys(c).sort((a, b) => c[b] - c[a]).map(b => ({ b, n: c[b] })); };

    const needFile = `<div class="notice-warn small cc-needfile"><b>Load your class file to see the details.</b> Grades, signals, SBA and benchmark come from the file on your computer (DIALD does not save them). <a href="#/class">Upload the class file →</a> The counts below come from your saved plans.</div>`;
    const lite = (intro) => intro + needFile + `<div class="cc-grid">${QS.map(q => `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}<p class="small" style="margin:6px 0 0">${esc(E.QUADRANTS[q].short)}. ${esc(E.QUADRANTS[q].note)}</p></div>`).join('')}</div>`;
    const stages = [
      // 01 Profile: who is in each group
      () => !full ? lite(`<div class="card cc-intro"><div class="eyebrow">01 · Profile</div><h2>Who is in each group?</h2><p>${total} students in this class plan, one group per quadrant.</p></div>`) : `<div class="card cc-intro"><div class="eyebrow">01 · Profile</div><h2>Who is in each group?</h2>
          <p>Your ${items.length} students, placed by the lower level of each pair (oral language and literacy, High = level ${info ? info.high : 3}+). Each quadrant is a group that can share one plan.</p></div>
        <div class="cc-grid">${QS.map(q => {
          const xs = by[q]; if (!xs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}${empty(q)}</div>`;
          const gr = count(xs, x => x.s.grade), sig = count(xs, x => x.r.risk.level);
          const iep = xs.filter(x => x.s.iep).length, s504 = xs.filter(x => x.s.s504).length;
          const ela = xs.filter(x => (crit(x, 'ela') || {}).status === 'concern').length, ben = xs.filter(x => (crit(x, 'bench') || {}).status === 'concern').length;
          const hasEla = xs.some(x => crit(x, 'ela') && crit(x, 'ela').status !== 'insufficient'), hasBen = xs.some(x => crit(x, 'bench') && crit(x, 'bench').status !== 'insufficient');
          return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}
            <p class="small" style="margin:6px 0 10px">${esc(E.QUADRANTS[q].short)}</p>
            <dl class="cc-dl">
              <dt>Grades</dt><dd>${Object.keys(gr).sort((a, b) => (+a || 0) - (+b || 0)).map(g => `Grade ${esc(g)}: ${gr[g]}`).join(' · ') || '—'}</dd>
              <dt>Persistent signal</dt><dd><b>${(sig.Persistent || 0) + (sig.Horizon || 0)}</b>${sig.Horizon ? ` <span class="small">(${sig.Horizon} near or past the ${info ? info.horizon : 6}-year LTEL horizon)</span>` : ''}</dd>
              ${hasEla ? `<dt>Below standard on the state ELA test</dt><dd><b>${ela}</b> of ${xs.length}</dd>` : ''}
              ${hasBen ? `<dt>Below benchmark two times in a row</dt><dd><b>${ben}</b> of ${xs.length}</dd>` : ''}
              ${iep || s504 ? `<dt>IEP / 504</dt><dd>${iep} IEP · ${s504} 504</dd>` : ''}
            </dl>
            <a class="small" href="#/class" data-filter="${q}">See these students →</a></div>`;
        }).join('')}</div>`,
      // 02 Pattern
      () => !full ? lite(`<div class="card cc-intro"><div class="eyebrow">02 · Pattern Indicator</div><h2>What pattern does each group show?</h2><p>The pattern is what repeats over the years: which side stays ahead, for how long, and whether it grows.</p></div>`) : `<div class="card cc-intro"><div class="eyebrow">02 · Pattern Indicator</div><h2>What pattern does each group show?</h2>
          <p>The quadrant is one year. The pattern is what repeats over the years: which side stays ahead, for how long, and whether it grows.</p></div>
        <div class="cc-grid">${QS.map(q => {
          const xs = by[q]; if (!xs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}${empty(q)}</div>`;
          const runs = xs.filter(x => x.r.dims.persistence.run >= 2 && /oral|literacy/.test(x.r.dims.persistence.direction));
          const oral = runs.filter(x => x.r.dims.persistence.direction === 'oral').length, lit = runs.length - oral;
          const low = count(xs, x => { const ds = Object.keys(DN).filter(d => x.last[d] != null); if (!ds.length) return null; const m = Math.min(...ds.map(d => x.last[d])); return ds.filter(d => x.last[d] === m).map(d => DN[d]).join(' & '); });
          const topLow = Object.keys(low).sort((a, b) => low[b] - low[a])[0];
          const sig = count(xs, x => x.r.risk.level);
          const yrs = xs.map(x => Number(x.s.years)).filter(n => n > 0).sort((a, b) => a - b);
          return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}
            <p class="small" style="margin:6px 0 10px">${esc(E.QUADRANTS[q].note)}</p>
            <dl class="cc-dl">
              <dt>Same side ahead 2+ years</dt><dd>${runs.length ? `<b>${runs.length}</b> of ${xs.length}${oral ? ` · oral ahead: ${oral}` : ''}${lit ? ` · literacy ahead: ${lit}` : ''}` : 'None yet'}</dd>
              <dt>Lowest domain (most often)</dt><dd>${topLow ? `<b>${esc(topLow)}</b> (${low[topLow]} students)` : '—'}</dd>
              <dt>Growth signal</dt><dd>${['Horizon', 'Persistent', 'Emerging', 'None', 'NA'].filter(k => sig[k]).map(k => `<span class="badge ${k}" style="font-size:12px;padding:2px 7px">${esc(E.SIGNALS[k] || k)}: ${sig[k]}</span>`).join(' ')}</dd>
              ${yrs.length ? `<dt>Years in services</dt><dd>Median ${yrs[Math.floor(yrs.length / 2)]} · range ${yrs[0]}–${yrs[yrs.length - 1]}</dd>` : ''}
            </dl></div>`;
        }).join('')}</div>`,
      // 03 Instructional focus
      () => `<div class="card cc-intro"><div class="eyebrow">03 · Instructional Focus</div><h2>What should each group work on?</h2>
          <p>Each quadrant has a route in the Library: 12 weeks, 3 sessions a week, with the same summary task and rubric at weeks 1, 6, and 12.</p></div>
        <div class="cc-grid">${QS.map(q => {
          const xs = by[q]; if (!nq(q)) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}${empty(q)}</div>`;
          const gr = count(xs, x => x.s.grade);
          return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}
            <p style="margin:8px 0"><b>Focus:</b> ${esc((L.ROUTES && L.ROUTES[q] ? L.ROUTES[q].focus : ''))}</p>
            <div class="cc-routes">${bands(q).map(({ b, n }) => { const u = L.units && L.units[b] && L.units[b][q] && L.units[b][q][1];
              return `<a class="cc-route" href="#/library/lessons/${b}/${q}/1"><span><b>${esc(bandName(b))}</b> · Stage 1 · ${plural(n, 'student')}</span><small>${u ? esc(u.title) + ' · workbook and slides ready' : 'Planned sequence (materials being written)'}</small><i>→</i></a>`; }).join('')}</div>
            ${Object.keys(gr).length > 1 ? `<p class="small">Small groups to consider: ${Object.keys(gr).sort((a, b) => (+a || 0) - (+b || 0)).map(g => `Grade ${esc(g)} (${gr[g]})`).join(', ')}. You can split the plan by grade, English level, or signal.</p>` : ''}</div>`;
        }).join('')}</div>`,
      // 04 Response: start plans and monitor them
      () => `<div class="card cc-intro"><div class="eyebrow">04 · Response</div><h2>Start a plan for each group and monitor it</h2>
          <p>A group plan follows the route for 12 weeks. Enter the rubric scores at weeks 1, 6, and 12 to see who is responding. DIALD saves only student codes and scores.</p>
          ${set ? `<p class="small" style="margin:0">Open a plan to enter the rubric scores. ${full ? '' : 'To add a plan with subgroups, load the class file first.'}</p>` : `<p class="small" style="margin:0">To save one plan per quadrant, use <b>“Add this class to My plans”</b> at the bottom of the page.</p>`}
          ${planErr ? `<p class="err small">${esc(planErr)}</p>` : ''}</div>
        <div class="cc-grid">${QS.map(q => {
          const xs = by[q]; const gs = plans.filter(g => g.quadrant === q);
          if (!nq(q) && !gs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}${empty(q)}</div>`;
          return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}
            ${gs.length ? `<div class="cc-plans">${gs.map(g => G.cardHTML(g, esc)).join('')}</div>` : '<p class="small">No group plan yet.</p>'}
            ${ctx.startGroup && full && xs.length ? `<button class="btn small-btn" type="button" data-gstart="${q}">+ ${gs.length ? 'Another' : 'Start a'} ${q} plan (choose subgroups)</button>` : ''}</div>`;
        }).join('')}</div>`,
      // 05 Adaptation
      () => `<div class="card cc-intro"><div class="eyebrow">05 · Adaptation</div><h2>What should change next?</h2>
          <p>Based on the rubric scores in your group plans. Keep what works; adjust where progress is limited. When the next state test arrives, upload the new file: the cycle starts again, and students who moved to another quadrant are flagged in their plans.</p></div>
        <div class="cc-grid">${QS.map(q => {
          const gs = plans.filter(g => g.quadrant === q);
          if (!gs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}<p class="small">${nq(q) ? 'No group plan yet. Start one in 04 · Response.' : 'No students in this profile.'}</p></div>`;
          const sm = { Positive: 0, Partial: 0, Limited: 0, 'Not yet': 0 }; gs.forEach(g => { const s = G.summary(g); Object.keys(sm).forEach(k => { sm[k] += s[k]; }); });
          const scored = sm.Positive + sm.Partial + sm.Limited;
          const lead = scored ? ['Positive', 'Partial', 'Limited'].sort((a, b) => sm[b] - sm[a])[0] : 'Not yet';
          const moved = gs.reduce((n, g) => n + G.moved(g).length, 0);
          return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}
            <div class="gp-sum" style="margin-top:8px">${['Positive', 'Partial', 'Limited', 'Not yet'].map(k => `<div class="gp-s ${k.replace(' ', '')}"><b>${sm[k]}</b><span>${k}</span></div>`).join('')}</div>
            ${moved ? `<div class="gc-alert">⚠ ${plural(moved, 'student')} moved to another quadrant</div>` : ''}
            <p class="small" style="margin:8px 0 4px"><b>${lead === 'Not yet' ? 'No scores yet' : 'Most students: ' + lead}</b></p>
            <ul class="small">${(E.ADAPT[lead] || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
            <div class="row" style="gap:6px">${gs.map(g => `<a class="btn ghost small-btn" href="#/group/${g.id}">${esc(g.title || q)}</a>`).join('')}</div></div>`;
        }).join('')}</div>`
    ];

    main.innerHTML = `<div class="page class-cycle">
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px">
        <div><div class="eyebrow">${set ? 'Class plan · the DIALD cycle' : 'Learner Trajectory · A whole class'}</div>
          <div class="row" style="gap:8px;align-items:center"><h1 style="margin:2px 0 4px" id="cc-title">${set ? esc(set.name) : 'My class: the DIALD cycle'}</h1>${set && set.id !== 'other' ? '<button class="icon-btn" id="cc-ren" title="Rename" aria-label="Rename this class plan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button>' : ''}</div>
          <p class="small" style="margin:0">${set ? `${plural(total, 'student')} · ${plural(plans.length, 'group plan')}${full ? ' · <span class="local-chip">🔒 Class file loaded on this computer</span>' : ''}` : `<span class="local-chip">🔒 On this computer only</span> ${esc(info.fileName)} · ${items.length} students · one group per quadrant`}</p></div>
        <div class="row" style="gap:8px">${set ? '<a class="btn" href="#/plans">← My plans</a>' : '<a class="btn" href="#/class">← My class</a>'}</div>
      </div>
      <div class="stages" role="tablist">${STAGES.map((x, i) => `<a role="tab" href="${base}${i + 1}" class="${st === i ? 'on' : ''}" aria-selected="${st === i}"><span>0${i + 1}</span>${x}</a>`).join('')}</div>
      <div class="cc-body">${stages[st]()}</div>
      <div class="cc-nav">${st > 0 ? `<a class="btn" href="${base}${st}">← ${STAGES[st - 1]}</a>` : (set ? '<a class="btn" href="#/plans">← My plans</a>' : '<a class="btn" href="#/class">← My class</a>')}
        ${st < 4 ? `<a class="btn primary" href="${base}${st + 2}">Next: ${STAGES[st + 1]} →</a>` : '<a class="btn primary" href="#/plans">Go to My plans →</a>'}</div>
    </div>
    ${set ? '' : '<div class="savebar" id="cc-save"></div>'}`;

    const ren = main.querySelector('#cc-ren'); if (ren) ren.onclick = () => {
      const h = main.querySelector('#cc-title');
      h.outerHTML = `<form class="ren" id="cc-ren-f"><input maxlength="60" value="${esc(set.name)}" aria-label="Class plan name"><button class="btn primary" type="submit">Save</button><button class="btn ghost" type="button">Cancel</button><small class="err"></small></form>`;
      ren.hidden = true; const f = main.querySelector('#cc-ren-f'), inp = f.querySelector('input'); inp.focus(); inp.select();
      f.querySelector('[type=button]').onclick = () => render(main, st, ctx, setId);
      f.onsubmit = async e => { e.preventDefault(); const t = inp.value.trim() || setName(), bad = ctx.titleProblem ? ctx.titleProblem(t) : '';
        if (bad) { f.querySelector('small').textContent = bad; return; }
        const { error } = await ctx.sb.from('group_plans').update({ set_name: t }).eq('set_id', set.id);
        if (error) { f.querySelector('small').textContent = noSetCols(error) ? 'Run supabase-class-plans.sql once in Supabase first.' : error.message; return; }
        ctx.toast('Class plan renamed.'); render(main, st, ctx, setId); };
    };
    main.querySelectorAll('[data-filter]').forEach(a => a.onclick = () => R.setFilter(a.dataset.filter));
    main.querySelectorAll('[data-gstart]').forEach(b => b.onclick = () => {
      const q = b.dataset.gstart;
      ctx.startGroup(Object.assign({ q, qName: E.QUADRANTS[q].name, members: by[q].map(R.memberFor), filtered: false }, set ? { setId: set.id === 'other' ? null : set.id, setName: set.name } : {}));
    });
    if (!set) saveBar(main.querySelector('#cc-save'), Object.assign({}, ctx, { onSaved: () => render(main, st, ctx) }));
  }

  // Sticky bar on My class and on the class cycle: save the class to My plans (one group plan per quadrant).
  async function saveBar(el, ctx) {
    if (!el) return;
    const { esc } = ctx, R = window.DIALDRoster, G = window.DIALDGroups;
    const items = R ? R.analyzedItems() : [];
    if (!items.length) { el.remove(); return; }
    if (!ctx.sb || !G) { el.innerHTML = '<div class="savebar-in small"><a class="btn primary" href="#/login?next=class">Sign in to save this class</a> Your file stays on this page while you sign in.</div>'; return; }
    el.innerHTML = '<div class="savebar-in small">Checking My plans…</div>';
    const by = {}; QS.forEach(q => { by[q] = items.filter(x => x.r.quadrant.id === q); });
    const res = await G.list(ctx.sb);
    if (res.error) { el.innerHTML = `<div class="savebar-in small">${esc(G.isSetupError(res.error) ? G.SETUP : 'Could not check My plans: ' + res.error.message)}</div>`; return; }
    const codes = new Set(items.map(x => x.s.code));
    const groups = QS.filter(q => by[q].length);
    let todo = groups.filter(q => !(res.data || []).some(g => g.quadrant === q && (g.members || []).some(m => codes.has(m.c))));
    const found = findSet(res.data || [], items), sid = found ? found.setId : uuid(), sname = found ? found.setName : setName();
    const chips = qs => qs.map(q => `<span class="sv-chip"><span class="qchip" style="--c:${QC[q]}">${q}</span> ${plural(by[q].length, 'student')}</span>`).join('');
    const draw = mode => {
      if (!todo.length) {
        el.innerHTML = `<div class="savebar-in"><span class="sv-ok">✓ Saved in My plans</span><span class="small">${found ? '“' + esc(found.setName) + '”' : plural(groups.length, 'group plan')} · one group per quadrant.</span>${found ? `<a class="btn primary" href="#/cycle/${encodeURIComponent(found.setId)}?s=4">Open the class plan →</a>` : '<a class="btn primary" href="#/plans">Open My plans →</a>'}</div>`;
        return;
      }
      if (mode === 'confirm') {
        el.innerHTML = `<div class="savebar-in sv-confirm"><div><b>Save “${esc(sname)}” to My plans?</b> <span class="small">(${plural(todo.length, 'group plan')}; you can rename it later)</span><div class="sv-chips">${chips(todo)}</div><span class="small">Stage 1 route · week 1 starts today · only student codes are saved, never names.</span></div>
          <div class="row" style="gap:8px"><button class="btn primary" id="sv-yes" type="button">Yes, save to My plans</button><button class="btn ghost" id="sv-no" type="button">Cancel</button></div></div>`;
        el.querySelector('#sv-no').onclick = () => draw();
        el.querySelector('#sv-yes').onclick = async () => {
          const b = el.querySelector('#sv-yes'); b.disabled = true; b.textContent = 'Saving…';
          const d = new Date(), today = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
          const rows = todo.map(q => {
            const bs = by[q].map(x => R.band(x.s.grade)).filter(Boolean); const bd = bs.sort((p, n) => bs.filter(v => v === n).length - bs.filter(v => v === p).length)[0] || '6-8';
            return { title: q + ' · ' + E.QUADRANTS[q].name, quadrant: q, band: bd, stage: 1, subgroup: '', start_date: today, members: by[q].map(x => ({ c: x.s.code, q })), set_id: sid, set_name: sname };
          });
          const { error } = await insertPlans(ctx.sb, rows, ctx.toast);
          if (error) { ctx.toast(G.isSetupError(error) ? G.SETUP : 'Could not save: ' + error.message); draw('confirm'); return; }
          ctx.toast('Saved to My plans.'); todo = [];
          if (ctx.onSaved) ctx.onSaved(); else saveBar(el, ctx);
        };
        return;
      }
      const done = groups.length - todo.length;
      el.innerHTML = `<div class="savebar-in"><button class="btn primary" id="sv-add" type="button">+ Add this class to My plans</button><span class="small">${done ? done + ' of ' + groups.length + ' groups are already saved. This adds ' + plural(todo.length, 'more plan') + '.' : 'Creates ' + plural(todo.length, 'group plan') + ', one per quadrant. You can split them into subgroups later.'}</span></div>`;
      el.querySelector('#sv-add').onclick = () => draw('confirm');
    };
    draw();
  }

  window.DIALDClassCycle = { render, saveBar, currentSet, insertPlans };
})();
