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

  async function render(main, stage, ctx) {
    const { esc } = ctx, R = window.DIALDRoster, G = window.DIALDGroups;
    const items = R ? R.analyzedItems() : [];
    if (!items.length) {
      main.innerHTML = `<div class="page"><div class="card"><h2 style="margin-top:0">No class file on this computer</h2><p>Upload your class first. Then choose <b>Next</b> to see the DIALD cycle for each quadrant group.</p><a class="btn primary" href="#/class">Upload a class</a></div></div>`;
      return;
    }
    const info = R.classInfo(), st = Math.max(0, Math.min(4, Number(stage) || 0));
    const by = {}; QS.forEach(q => { by[q] = items.filter(x => x.r.quadrant.id === q); });
    let plans = [], planErr = '';
    if (st >= 3 && ctx.sb && G) { const r = await G.list(ctx.sb); if (r.error) planErr = G.isSetupError(r.error) ? G.SETUP : r.error.message; else plans = r.data || []; }
    const head = q => `<div class="cc-qhead" style="--c:${QC[q]}"><span class="qchip" style="--c:${QC[q]}">${q}</span><b>${esc(E.QUADRANTS[q].name)}</b><span class="small">${plural(by[q].length, 'student')} · ${pct(by[q].length, items.length)}%</span></div>`;
    const empty = q => `<p class="small">No students in this profile.</p>`;
    const bands = q => { const c = count(by[q], x => R.band(x.s.grade)); return Object.keys(c).sort((a, b) => c[b] - c[a]).map(b => ({ b, n: c[b] })); };

    const stages = [
      // 01 Profile: who is in each group
      () => `<div class="card cc-intro"><div class="eyebrow">01 · Profile</div><h2>Who is in each group?</h2>
          <p>Your ${items.length} students, placed by the lower level of each pair (oral language and literacy, High = level ${info.high}+). Each quadrant is a group that can share one plan.</p></div>
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
              <dt>Persistent signal</dt><dd><b>${(sig.Persistent || 0) + (sig.Horizon || 0)}</b>${sig.Horizon ? ` <span class="small">(${sig.Horizon} near or past the ${info.horizon}-year LTEL horizon)</span>` : ''}</dd>
              ${hasEla ? `<dt>Below standard on the state ELA test</dt><dd><b>${ela}</b> of ${xs.length}</dd>` : ''}
              ${hasBen ? `<dt>Below benchmark two times in a row</dt><dd><b>${ben}</b> of ${xs.length}</dd>` : ''}
              ${iep || s504 ? `<dt>IEP / 504</dt><dd>${iep} IEP · ${s504} 504</dd>` : ''}
            </dl>
            <a class="small" href="#/class" data-filter="${q}">See these students →</a></div>`;
        }).join('')}</div>`,
      // 02 Pattern
      () => `<div class="card cc-intro"><div class="eyebrow">02 · Pattern Indicator</div><h2>What pattern does each group show?</h2>
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
          const xs = by[q]; if (!xs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}${empty(q)}</div>`;
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
          ${ctx.startGroup && !plans.length && !planErr ? `<button class="btn primary" type="button" id="cc-all">Create one plan per quadrant (${QS.filter(q => by[q].length).length})</button>` : ''}
          ${planErr ? `<p class="err small">${esc(planErr)}</p>` : ''}</div>
        <div class="cc-grid">${QS.map(q => {
          const xs = by[q]; const gs = plans.filter(g => g.quadrant === q);
          if (!xs.length && !gs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}${empty(q)}</div>`;
          return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}
            ${gs.length ? `<div class="cc-plans">${gs.map(g => G.cardHTML(g, esc)).join('')}</div>` : '<p class="small">No group plan yet.</p>'}
            ${ctx.startGroup && xs.length ? `<button class="btn small-btn" type="button" data-gstart="${q}">+ ${gs.length ? 'Another' : 'Start a'} ${q} plan (choose subgroups)</button>` : ''}</div>`;
        }).join('')}</div>`,
      // 05 Adaptation
      () => `<div class="card cc-intro"><div class="eyebrow">05 · Adaptation</div><h2>What should change next?</h2>
          <p>Based on the rubric scores in your group plans. Keep what works; adjust where progress is limited. When the next state test arrives, upload the new file: the cycle starts again, and students who moved to another quadrant are flagged in their plans.</p></div>
        <div class="cc-grid">${QS.map(q => {
          const gs = plans.filter(g => g.quadrant === q);
          if (!gs.length) return `<div class="card cc-card" style="--c:${QC[q]}">${head(q)}<p class="small">${by[q].length ? 'No group plan yet. Start one in 04 · Response.' : 'No students in this profile.'}</p></div>`;
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
        <div><div class="eyebrow">Learner Trajectory · A whole class</div><h1 style="margin-bottom:4px">My class: the DIALD cycle</h1>
          <p class="small" style="margin:0"><span class="local-chip">🔒 On this computer only</span> ${esc(info.fileName)} · ${items.length} students · one group per quadrant</p></div>
        <a class="btn" href="#/class">← My class</a>
      </div>
      <div class="stages" role="tablist">${STAGES.map((s, i) => `<a role="tab" href="#/class/cycle?s=${i + 1}" class="${st === i ? 'on' : ''}" aria-selected="${st === i}"><span>0${i + 1}</span>${s}</a>`).join('')}</div>
      <div class="cc-body">${stages[st]()}</div>
      <div class="cc-nav">${st > 0 ? `<a class="btn" href="#/class/cycle?s=${st}">← ${STAGES[st - 1]}</a>` : '<a class="btn" href="#/class">← My class</a>'}
        ${st < 4 ? `<a class="btn primary" href="#/class/cycle?s=${st + 2}">Next: ${STAGES[st + 1]} →</a>` : '<a class="btn primary" href="#/plans">Go to My plans →</a>'}</div>
    </div>`;

    main.querySelectorAll('[data-filter]').forEach(a => a.onclick = () => R.setFilter(a.dataset.filter));
    main.querySelectorAll('[data-gstart]').forEach(b => b.onclick = () => {
      const q = b.dataset.gstart;
      ctx.startGroup({ q, qName: E.QUADRANTS[q].name, members: by[q].map(R.memberFor), filtered: false });
    });
    const all = main.querySelector('#cc-all'); if (all) all.onclick = async () => {
      if (all.dataset.armed !== '1') { all.dataset.armed = '1'; all.textContent = 'Click again: create ' + QS.filter(q => by[q].length).length + ' plans (Stage 1, starting today)'; return; }
      all.disabled = true; all.textContent = 'Saving…';
      const d = new Date(), today = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
      const rows = QS.filter(q => by[q].length).map(q => {
        const bs = by[q].map(x => R.band(x.s.grade)).filter(Boolean); const b = bs.sort((p, n) => bs.filter(v => v === n).length - bs.filter(v => v === p).length)[0] || '6-8';
        return { title: q + ' · ' + E.QUADRANTS[q].name, quadrant: q, band: b, stage: 1, subgroup: '', start_date: today, members: by[q].map(x => ({ c: x.s.code, q })) };
      });
      const { error } = await ctx.sb.from('group_plans').insert(rows);
      if (error) { ctx.toast(G.isSetupError(error) ? G.SETUP : 'Could not save: ' + error.message); all.disabled = false; all.textContent = 'Try again'; return; }
      ctx.toast(rows.length + ' group plans created.'); render(main, st, ctx);
    };
  }

  window.DIALDClassCycle = { render };
})();
